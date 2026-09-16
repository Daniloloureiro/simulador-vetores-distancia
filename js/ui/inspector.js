/**
 * inspector.js - Painel Didático de Inspeção da Equação de Bellman-Ford
 * Explica matematicamente passo a passo como o nó calculou a distância para qualquer destino.
 */

export class MathInspector {
  constructor(containerElement, simulator) {
    this.container = containerElement;
    this.sim = simulator;
    this.currentRouterId = null;
    this.currentDestId = null;
  }

  inspect(routerId, destId = null) {
    this.currentRouterId = routerId;
    const router = this.sim.routers.get(routerId);
    if (!router) {
      this.container.innerHTML = `
        <div class="inspector-placeholder">
          <p>Selecione um roteador ou uma rota na tabela para inspecionar os cálculos da equação de Bellman-Ford.</p>
        </div>
      `;
      return;
    }

    // Se não informou destino, seleciona o primeiro destino diferente de si
    if (!destId || destId === routerId) {
      const otherDests = this.sim.graph.getNodeIds().filter(id => id !== routerId);
      this.currentDestId = otherDests.length > 0 ? otherDests[0] : routerId;
    } else {
      this.currentDestId = destId;
    }

    this.render();
  }

  render() {
    const router = this.sim.routers.get(this.currentRouterId);
    if (!router) return;

    const dest = this.currentDestId;
    const entry = router.routingTable.get(dest);

    const allDests = this.sim.graph.getNodeIds();
    const destOptions = allDests.map(d => 
      `<option value="${d}" ${d === dest ? 'selected' : ''}>Destino: ${d} ${d === router.id ? '(Local)' : ''}</option>`
    ).join('');

    let calculationHtml = '';

    if (dest === router.id) {
      calculationHtml = `
        <div class="calc-box">
          <div class="formula-title">Distância para Si Mesmo:</div>
          <div class="formula-math">D<sub>${router.label}</sub>(${dest}) = 0</div>
          <p class="formula-desc">O custo de um nó para ele mesmo é convencionado como zero no protocolo.</p>
        </div>
      `;
    } else if (!entry || !entry.calculation) {
      calculationHtml = `
        <div class="calc-box">
          <p class="formula-desc">Aguardando a primeira troca de vetores nesta iteração...</p>
        </div>
      `;
    } else {
      const calc = entry.calculation;
      const termsList = calc.terms || [];

      const rows = termsList.map(t => {
        const isChosen = (t.neighbor === calc.chosen && t.total < this.sim.infinity);
        const linkStr = t.linkCost >= this.sim.infinity ? '∞' : t.linkCost;
        const distStr = t.neighborDist >= this.sim.infinity ? '∞' : t.neighborDist;
        const totalStr = t.total >= this.sim.infinity ? '∞' : t.total;

        return `
          <tr class="${isChosen ? 'chosen-term' : ''}">
            <td><strong>Vizinho ${t.neighbor}</strong></td>
            <td>c(${router.label}, ${t.neighbor}) = ${linkStr}</td>
            <td>D<sub>${t.neighbor}</sub>(${dest}) = ${distStr}</td>
            <td><strong>${totalStr}</strong></td>
            <td>${isChosen ? '<span class="badge badge-success">✓ Rota Mínima</span>' : '<span class="badge badge-secondary">Descartado</span>'}</td>
          </tr>
        `;
      }).join('');

      calculationHtml = `
        <div class="calc-box">
          <div class="formula-title">Equação de Bellman-Ford Aplicada:</div>
          <div class="formula-math">
            D<sub>${router.label}</sub>(${dest}) = min<sub>v</sub> { c(${router.label}, v) + D<sub>v</sub>(${dest}) }
          </div>

          <div class="terms-table-wrapper">
            <table class="terms-table">
              <thead>
                <tr>
                  <th>Vizinho (v)</th>
                  <th>Custo do Enlace c(x, v)</th>
                  <th>Vetor do Vizinho D<sub>v</sub>(y)</th>
                  <th>Soma Total</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length > 0 ? rows : '<tr><td colspan="5">Nenhum vizinho ativo disponível para este nó.</td></tr>'}
              </tbody>
            </table>
          </div>

          <div class="calc-conclusion">
            <strong>Decisão Final:</strong>
            ${entry.cost >= this.sim.infinity 
              ? `<span class="text-danger">Destino ${dest} inalcançável (Métrica: ∞ = ${this.sim.infinity}). Próximo salto: nenhum.</span>`
              : `<span class="text-success">Menor custo calculado = <strong>${entry.cost}</strong> com Próximo Salto via <strong>Roteador ${entry.nextHop}</strong>.</span>`
            }
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="inspector-card">
        <div class="inspector-header">
          <div class="inspector-title">
            <span class="inspector-badge">Bellman-Ford Inspector</span>
            <h3>Cálculo do Roteador ${router.label}</h3>
          </div>
          <div class="inspector-selector">
            <select id="inspector-dest-select" class="select-input">
              ${destOptions}
            </select>
          </div>
        </div>
        ${calculationHtml}
      </div>
    `;

    const selectEl = this.container.querySelector('#inspector-dest-select');
    if (selectEl) {
      selectEl.addEventListener('change', (e) => {
        this.currentDestId = e.target.value;
        this.render();
      });
    }
  }
}
