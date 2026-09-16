/**
 * router.js - Representação do Roteador e sua Tabela de Roteamento
 * Mantém o vetor de distância local, vetores recebidos dos vizinhos e histórico de alterações.
 */

export const DEFAULT_INFINITY = 16;

export class RouterState {
  constructor(id, label = id, infinityMetric = DEFAULT_INFINITY) {
    this.id = id;
    this.label = label;
    this.infinity = infinityMetric;

    // Tabela de roteamento local:
    // destinationId -> { destination, cost, nextHop, changed, calculation }
    this.routingTable = new Map();

    // Vetores de distância conhecidos de cada vizinho:
    // neighborId -> Map(destinationId -> cost)
    this.neighborVectors = new Map();

    // Custos diretos para os vizinhos conhecidos:
    // neighborId -> cost
    this.directLinkCosts = new Map();

    // Inicializa rota para si mesmo
    this.routingTable.set(this.id, {
      destination: this.id,
      cost: 0,
      nextHop: this.id,
      changed: false,
      calculation: {
        formula: `D_${this.label}(${this.label}) = 0`,
        terms: [{ neighbor: this.label, linkCost: 0, neighborDist: 0, total: 0 }],
        chosen: this.label
      }
    });
  }

  /**
   * Atualiza o custo direto de enlace para um vizinho.
   * Se o enlace caiu, o custo é considerado infinito.
   */
  setNeighborLinkCost(neighborId, cost) {
    if (cost === undefined || cost === null || cost >= this.infinity) {
      this.directLinkCosts.delete(neighborId);
      this.neighborVectors.delete(neighborId);
    } else {
      this.directLinkCosts.set(neighborId, cost);
      if (!this.neighborVectors.has(neighborId)) {
        this.neighborVectors.set(neighborId, new Map());
      }
    }
  }

  /**
   * Recebe um vetor de distância enviado por um vizinho.
   * vectorData é um objeto ou Map com { [destId]: cost }
   */
  receiveVector(neighborId, vectorData) {
    if (!this.directLinkCosts.has(neighborId)) {
      // Se não há enlace direto ativo, ignora o vetor
      return false;
    }

    let nMap = this.neighborVectors.get(neighborId);
    if (!nMap) {
      nMap = new Map();
      this.neighborVectors.set(neighborId, nMap);
    }

    const entries = vectorData instanceof Map ? vectorData.entries() : Object.entries(vectorData);
    for (const [dest, cost] of entries) {
      const sanitizedCost = Math.min(this.infinity, Math.max(0, cost));
      nMap.set(dest, sanitizedCost);
    }
    return true;
  }

  /**
   * Gera o vetor de distância a ser anunciado para um determinado vizinho,
   * considerando a técnica de mitigação configurada.
   * 
   * Modo:
   * - 'none': Anuncia D_x(y) real para todos.
   * - 'split_horizon': Não anuncia y se o nextHop para y for o vizinho.
   * - 'poisoned_reverse': Anuncia infinity se o nextHop para y for o vizinho.
   */
  getAdvertisedVector(targetNeighborId, mode = 'none') {
    const vector = {};

    for (const [dest, entry] of this.routingTable.entries()) {
      if (entry.cost >= this.infinity) {
        vector[dest] = this.infinity;
        continue;
      }

      if (entry.nextHop === targetNeighborId) {
        if (mode === 'poisoned_reverse') {
          // Envenena a rota: anuncia infinito de volta para quem é o próximo salto
          vector[dest] = this.infinity;
        } else if (mode === 'split_horizon') {
          // Horizonte Dividido simples: omite a rota (ou envia infinito)
          // Na prática de protocolos, omitir equivale a não anunciar. Aqui marcamos infinito
          vector[dest] = this.infinity;
        } else {
          // Modo normal: anuncia o custo que possui
          vector[dest] = entry.cost;
        }
      } else {
        vector[dest] = entry.cost;
      }
    }

    return vector;
  }

  /**
   * Retorna uma cópia da tabela de roteamento como array para renderização na UI.
   */
  getTableEntries() {
    const list = [];
    for (const entry of this.routingTable.values()) {
      list.push({
        destination: entry.destination,
        cost: entry.cost,
        nextHop: entry.nextHop,
        changed: entry.changed,
        calculation: entry.calculation
      });
    }
    // Ordena pelo ID de destino
    return list.sort((a, b) => a.destination.localeCompare(b.destination));
  }

  /**
   * Reseta flags de mudança visual
   */
  clearChangedFlags() {
    for (const entry of this.routingTable.values()) {
      entry.changed = false;
    }
  }
}
