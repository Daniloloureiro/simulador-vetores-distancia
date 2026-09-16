/**
 * simulator.js - Orquestrador da Simulação de Redes
 * Controla os passos de execução, despacho de pacotes, histórico de eventos
 * e estado de convergência da rede.
 */

import { NetworkGraph } from './graph.js';
import { RouterState, DEFAULT_INFINITY } from './router.js';
import { BellmanFordSolver } from './bellman_ford.js';

export class NetworkSimulator {
  constructor(options = {}) {
    this.infinity = options.infinity || DEFAULT_INFINITY;
    this.mode = options.mode || 'none'; // 'none' | 'split_horizon' | 'poisoned_reverse'
    
    this.graph = new NetworkGraph();
    this.routers = new Map(); // id -> RouterState
    
    this.iteration = 0;
    this.isConverged = false;
    this.activePackets = []; // Pacotes visuais em trânsito
    this.eventLog = [];
    
    // Callbacks para UI
    this.onStateChange = null;
    this.onLog = null;
  }

  setMode(mode) {
    this.mode = mode;
    this.log('CONFIG', `Modo de operação alterado para: ${this.getModeName(mode)}`);
  }

  getModeName(mode = this.mode) {
    switch (mode) {
      case 'none': return 'Vetor de Distância Padrão (Sem Mitigação)';
      case 'split_horizon': return 'Split Horizon (Horizonte Dividido)';
      case 'poisoned_reverse': return 'Poisoned Reverse (Envenenamento Reverso)';
      default: return mode;
    }
  }

  setInfinity(val) {
    this.infinity = Number(val) || DEFAULT_INFINITY;
    for (const r of this.routers.values()) {
      r.infinity = this.infinity;
    }
    this.log('CONFIG', `Métrica de infinito definida como: ${this.infinity}`);
  }

  /**
   * Inicializa ou reseta a rede com base na topologia do grafo.
   */
  initFromGraph(graph) {
    this.graph = graph;
    this.routers.clear();
    this.iteration = 0;
    this.isConverged = false;
    this.activePackets = [];
    this.eventLog = [];

    const nodeIds = this.graph.getNodeIds();

    // 1. Cria o estado de cada roteador
    for (const nodeId of nodeIds) {
      const node = this.graph.nodes.get(nodeId);
      const router = new RouterState(nodeId, node.label, this.infinity);
      this.routers.set(nodeId, router);
    }

    // 2. Registra os custos diretos de enlaces conhecidos inicialmente
    this.syncDirectLinks();

    // 3. Inicializa cada nó com rotas para si (0) e para vizinhos diretos
    for (const router of this.routers.values()) {
      for (const dest of nodeIds) {
        if (dest === router.id) continue;

        if (router.directLinkCosts.has(dest)) {
          const directCost = router.directLinkCosts.get(dest);
          router.routingTable.set(dest, {
            destination: dest,
            cost: directCost,
            nextHop: dest,
            changed: true,
            calculation: {
              formula: `Enlace direto inicial`,
              terms: [{ neighbor: dest, linkCost: directCost, neighborDist: 0, total: directCost }],
              chosen: dest,
              minCost: directCost
            }
          });
        } else {
          router.routingTable.set(dest, {
            destination: dest,
            cost: this.infinity,
            nextHop: null,
            changed: false,
            calculation: {
              formula: `Sem enlace direto`,
              terms: [],
              chosen: null,
              minCost: this.infinity
            }
          });
        }
      }
    }

    this.log('INFO', `Topologia inicializada com ${nodeIds.length} roteadores e ${this.graph.links.size} enlaces.`);
    this.notifyStateChange();
  }

  /**
   * Sincroniza os custos diretos a partir do grafo (inclui enlaces rompidos).
   */
  syncDirectLinks() {
    for (const router of this.routers.values()) {
      // Limpa custos atuais
      router.directLinkCosts.clear();
      
      const neighbors = this.graph.getNeighbors(router.id);
      for (const n of neighbors) {
        router.setNeighborLinkCost(n.neighborId, n.weight);
      }
    }
  }

  /**
   * Trata evento de corte ou restabelecimento de enlace.
   */
  handleLinkToggle(linkId) {
    const link = this.graph.links.get(linkId);
    if (!link) return;

    this.graph.toggleLinkStatus(linkId);
    this.syncDirectLinks();
    this.isConverged = false;

    const statusMsg = link.status === 'down' ? '🔴 ROMPIDO / FALHA' : '🟢 RESTABELECIDO';
    this.log('TOPOLOGIA', `Enlace ${link.source} <-> ${link.target} foi ${statusMsg}!`);

    // Notifica os roteadores incidentes sobre a mudança no enlace
    const rSource = this.routers.get(link.source);
    const rTarget = this.routers.get(link.target);

    if (link.status === 'down') {
      if (rSource) rSource.setNeighborLinkCost(link.target, this.infinity);
      if (rTarget) rTarget.setNeighborLinkCost(link.source, this.infinity);
    } else {
      if (rSource) rSource.setNeighborLinkCost(link.target, link.weight);
      if (rTarget) rTarget.setNeighborLinkCost(link.source, link.weight);
    }

    // Recomputação local imediata dos roteadores das pontas
    const allNodes = this.graph.getNodeIds();
    if (rSource) BellmanFordSolver.recomputeRouter(rSource, allNodes);
    if (rTarget) BellmanFordSolver.recomputeRouter(rTarget, allNodes);

    this.notifyStateChange();
  }

  /**
   * Trata alteração de peso no enlace.
   */
  handleLinkWeightChange(linkId, newWeight) {
    const link = this.graph.links.get(linkId);
    if (!link) return;

    const oldWeight = link.weight;
    this.graph.setLinkWeight(linkId, newWeight);
    this.syncDirectLinks();
    this.isConverged = false;

    this.log('TOPOLOGIA', `Custo do enlace ${link.source} <-> ${link.target} alterado de ${oldWeight} para ${link.weight}.`);

    const allNodes = this.graph.getNodeIds();
    const rSource = this.routers.get(link.source);
    const rTarget = this.routers.get(link.target);
    if (rSource) BellmanFordSolver.recomputeRouter(rSource, allNodes);
    if (rTarget) BellmanFordSolver.recomputeRouter(rTarget, allNodes);

    this.notifyStateChange();
  }

  /**
   * Executa UM passo (iteração) síncrono da simulação:
   * 1. Cada roteador gera pacotes de vetor para todos os seus vizinhos ativos.
   * 2. Os vizinhos recebem os vetores e recomputam Bellman-Ford.
   * 3. Verifica se houve alguma alteração em qualquer tabela (convergência).
   */
  step() {
    if (this.isConverged) {
      this.log('INFO', 'A rede já está em estado de convergência (nenhuma rota mudou).');
      return { converged: true, updatesCount: 0, packets: [] };
    }

    this.iteration++;
    this.log('RODADA', `=== Iniciando Iteração ${this.iteration} (${this.getModeName()}) ===`);

    const allNodes = this.graph.getNodeIds();
    const packets = [];

    // Limpa os marcadores de mudança visual do passo anterior
    for (const router of this.routers.values()) {
      router.clearChangedFlags();
    }

    // Fase 1: Cada roteador prepara e despacha seu vetor para seus vizinhos ativos
    for (const [routerId, router] of this.routers.entries()) {
      const neighbors = this.graph.getNeighbors(routerId);

      for (const neighbor of neighbors) {
        const targetId = neighbor.neighborId;
        const advertisedVector = router.getAdvertisedVector(targetId, this.mode);

        const packet = {
          id: `pkt-${this.iteration}-${routerId}-${targetId}`,
          from: routerId,
          to: targetId,
          linkId: neighbor.linkId,
          vector: advertisedVector,
          iteration: this.iteration,
          progress: 0.0
        };

        packets.push(packet);
      }
    }

    // Fase 2: Entrega de todos os pacotes e absorção pelos roteadores de destino
    for (const pkt of packets) {
      const receiver = this.routers.get(pkt.to);
      if (receiver) {
        receiver.receiveVector(pkt.from, pkt.vector);
      }
    }

    // Fase 3: Recomputação de Bellman-Ford em todos os roteadores
    let totalChanges = 0;
    const roundUpdates = [];

    for (const router of this.routers.values()) {
      const res = BellmanFordSolver.recomputeRouter(router, allNodes);
      totalChanges += res.changedCount;
      if (res.updates.length > 0) {
        roundUpdates.push(...res.updates);
      }
    }

    // Registra atualizações no log
    if (roundUpdates.length > 0) {
      for (const upd of roundUpdates) {
        const oldC = upd.oldCost === null ? 'novo' : (upd.oldCost >= this.infinity ? '∞' : upd.oldCost);
        const newC = upd.newCost >= this.infinity ? '∞' : upd.newCost;
        const nextH = upd.newNextHop ? upd.newNextHop : 'nenhum';
        this.log('UPDATE', `Roteador ${upd.router}: rota para ${upd.destination} alterada de ${oldC} para ${newC} (via ${nextH})`);
      }
    } else {
      this.log('ESTÁVEL', `Nenhuma rota foi alterada nesta iteração.`);
    }

    // Fase 4: Avalia convergência
    if (totalChanges === 0) {
      this.isConverged = true;
      this.log('CONVERGÊNCIA', `🎉 Rede convergiu com sucesso após ${this.iteration} iterações!`);
    }

    this.activePackets = packets;
    this.notifyStateChange();

    return {
      converged: this.isConverged,
      updatesCount: totalChanges,
      packets: packets
    };
  }

  log(type, message, details = null) {
    const entry = {
      round: this.iteration,
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    this.eventLog.push(entry);
    if (this.onLog) {
      this.onLog(entry);
    }
  }

  notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange(this);
    }
  }
}
