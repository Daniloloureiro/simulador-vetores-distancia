/**
 * graph.js - Representação da Topologia de Rede
 * Gerencia roteadores (nós) e enlaces (arestas) com pesos e estados operacionais (up/down).
 */

export class NetworkGraph {
  constructor() {
    this.nodes = new Map(); // id -> { id, label, x, y }
    this.links = new Map(); // id -> { id, source, target, weight, status: 'up' | 'down' }
  }

  addNode(id, label = id, x = 100, y = 100) {
    if (this.nodes.has(id)) {
      throw new Error(`Nó com id "${id}" já existe.`);
    }
    const node = { id, label, x, y };
    this.nodes.set(id, node);
    return node;
  }

  removeNode(id) {
    if (!this.nodes.has(id)) return false;
    // Remove links conectados a este nó
    for (const [linkId, link] of this.links.entries()) {
      if (link.source === id || link.target === id) {
        this.links.delete(linkId);
      }
    }
    this.nodes.delete(id);
    return true;
  }

  addLink(source, target, weight = 1, status = 'up') {
    if (!this.nodes.has(source) || !this.nodes.has(target)) {
      throw new Error(`Nós de origem ou destino inexistentes: ${source} -> ${target}`);
    }
    if (source === target) {
      throw new Error('Enlaces para si mesmo não são permitidos.');
    }

    // Identificador canônico independente de direção (A-B == B-A)
    const [u, v] = [source, target].sort();
    const linkId = `${u}-${v}`;

    const link = {
      id: linkId,
      source: u,
      target: v,
      weight: Math.max(1, Math.round(weight)),
      status: status // 'up' | 'down'
    };

    this.links.set(linkId, link);
    return link;
  }

  removeLink(id) {
    return this.links.delete(id);
  }

  getLink(u, v) {
    const [a, b] = [u, v].sort();
    return this.links.get(`${a}-${b}`) || null;
  }

  setLinkStatus(linkId, status) {
    const link = this.links.get(linkId);
    if (link) {
      link.status = status === 'down' ? 'down' : 'up';
      return link;
    }
    return null;
  }

  toggleLinkStatus(linkId) {
    const link = this.links.get(linkId);
    if (link) {
      link.status = link.status === 'up' ? 'down' : 'up';
      return link;
    }
    return null;
  }

  setLinkWeight(linkId, weight) {
    const link = this.links.get(linkId);
    if (link) {
      link.weight = Math.max(1, Math.round(weight));
      return link;
    }
    return null;
  }

  /**
   * Retorna os vizinhos ativos de um nó e o custo direto do enlace.
   */
  getNeighbors(nodeId) {
    const neighbors = [];
    for (const link of this.links.values()) {
      if (link.status !== 'up') continue;

      if (link.source === nodeId) {
        neighbors.push({ neighborId: link.target, weight: link.weight, linkId: link.id });
      } else if (link.target === nodeId) {
        neighbors.push({ neighborId: link.source, weight: link.weight, linkId: link.id });
      }
    }
    return neighbors;
  }

  /**
   * Retorna todos os IDs de nós.
   */
  getNodeIds() {
    return Array.from(this.nodes.keys()).sort();
  }

  /**
   * Exporta a topologia para clonagem ou salvamento.
   */
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      links: Array.from(this.links.values())
    };
  }

  static fromJSON(data) {
    const graph = new NetworkGraph();
    for (const n of data.nodes) {
      graph.addNode(n.id, n.label, n.x, n.y);
    }
    for (const l of data.links) {
      graph.addLink(l.source, l.target, l.weight, l.status);
    }
    return graph;
  }
}
