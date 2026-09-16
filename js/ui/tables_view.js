/**
 * tables_view.js - Visualizador Dinâmico das Tabelas de Roteamento
 * Renderiza em tempo real a tabela de roteamento de cada nó com destaque visual
 * para rotas atualizadas (verde), rompidas/infinito (vermelho) ou estáveis.
 */

export class TablesView {
  constructor(containerElement, simulator, onRowClick = null) {
    this.container = containerElement;
    this.sim = simulator;
    this.onRowClick = onRowClick;
  }

  render(selectedNodeId = null) {
    this.container.innerHTML = '';

    const nodeIds = this.sim.graph.getNodeIds();
    if (nodeIds.length === 0) {
      this.container.innerHTML = '<div class="empty-state">Nenhum roteador na topologia.</div>';
      return;
    }

    for (const id of nodeIds) {
      const router = this.sim.routers.get(id);
      if (!router) continue;

      const isSelected = (id === selectedNodeId);
      const card = document.createElement('div');
      card.className = `router-card ${isSelected ? 'selected' : ''}`;
      card.dataset.routerId = id;

      // Cabeçalho do Cartão do Roteador
      const header = document.createElement('div');
      header.className = 'router-card-header';
      header.innerHTML = `
        <div class="router-title">
          <span class="router-badge">${id}</span>
          <span class="router-name">${router.label}</span>
        </div>
        <div class="router-status">
          ${this.getDirectLinksBadge(router)}
        </div>
      `;
      card.appendChild(header);

      // Tabela de Roteamento
      const table = document.createElement('table');
      table.className = 'routing-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Destino</th>
            <th>Custo (Métrica)</th>
            <th>Próximo Salto</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const tbody = table.querySelector('tbody');
      const entries = router.getTableEntries();

      for (const entry of entries) {
        const tr = document.createElement('tr');
        const isSelf = (entry.destination === id);
        const isInfinity = (entry.cost >= this.sim.infinity);

        let statusClass = '';
        if (entry.changed) {
          statusClass = isInfinity ? 'row-infinity' : 'row-updated';
        } else if (isInfinity) {
          statusClass = 'row-infinity';
        }

        tr.className = statusClass;
        tr.title = 'Clique para ver o cálculo Bellman-Ford desta rota';

        const costDisplay = isInfinity 
          ? `<span class="badge badge-danger">∞ (${entry.cost})</span>` 
          : `<span class="badge badge-cost">${entry.cost}</span>`;

        const nextHopDisplay = isSelf 
          ? `<span class="badge badge-self">Local (direto)</span>`
          : (entry.nextHop ? `<span class="badge badge-nexthop">${entry.nextHop}</span>` : `<span class="badge badge-none">—</span>`);

        tr.innerHTML = `
          <td><strong>${entry.destination}</strong></td>
          <td>${costDisplay}</td>
          <td>${nextHopDisplay}</td>
        `;

        tr.addEventListener('click', () => {
          if (this.onRowClick) {
            this.onRowClick(id, entry.destination);
          }
        });

        tbody.appendChild(tr);
      }

      card.appendChild(table);
      this.container.appendChild(card);
    }
  }

  getDirectLinksBadge(router) {
    const activeCount = router.directLinkCosts.size;
    return `<span class="link-count-badge">${activeCount} enlace${activeCount === 1 ? '' : 's'} ativo${activeCount === 1 ? '' : 's'}</span>`;
  }
}
