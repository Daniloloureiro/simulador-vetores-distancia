/**
 * bellman_ford.js - Motor de Cálculo da Equação de Bellman-Ford
 * D_x(y) = min_v { c(x, v) + D_v(y) }
 * 
 * Calcula as menores distâncias conhecidas e produz o detalhamento passo a passo
 * de cada termo para inspeção visual e didática.
 */

export class BellmanFordSolver {
  /**
   * Executa a computação de Bellman-Ford para um roteador específico.
   * 
   * @param {RouterState} router - O roteador executando o cálculo
   * @param {string[]} allDestinations - Lista de todos os nós conhecidos na rede
   * @returns {{ changedCount: number, updates: Array }}
   */
  static recomputeRouter(router, allDestinations) {
    let changedCount = 0;
    const updates = [];

    for (const dest of allDestinations) {
      if (dest === router.id) {
        // Rota para si mesmo é sempre 0
        const currentEntry = router.routingTable.get(dest);
        if (!currentEntry || currentEntry.cost !== 0) {
          router.routingTable.set(dest, {
            destination: dest,
            cost: 0,
            nextHop: dest,
            changed: true,
            calculation: {
              formula: `D_${router.label}(${router.label}) = 0`,
              terms: [{ neighbor: router.label, linkCost: 0, neighborDist: 0, total: 0 }],
              chosen: router.label,
              minCost: 0
            }
          });
          changedCount++;
        }
        continue;
      }

      // Para destinos externos y != x:
      // min_v { c(x, v) + D_v(y) }
      let minCost = router.infinity;
      let bestNextHop = null;
      const terms = [];

      // Avalia cada vizinho ativo
      for (const [neighborId, linkCost] of router.directLinkCosts.entries()) {
        const neighborVector = router.neighborVectors.get(neighborId);
        const neighborDist = neighborVector && neighborVector.has(dest) 
          ? neighborVector.get(dest) 
          : router.infinity;

        const totalCost = (linkCost >= router.infinity || neighborDist >= router.infinity)
          ? router.infinity
          : Math.min(router.infinity, linkCost + neighborDist);

        terms.push({
          neighbor: neighborId,
          linkCost: linkCost,
          neighborDist: neighborDist,
          total: totalCost
        });

        if (totalCost < minCost) {
          minCost = totalCost;
          bestNextHop = neighborId;
        } else if (totalCost === minCost && totalCost < router.infinity) {
          // Em caso de empate, mantém o nextHop anterior se ainda for válido para estabilidade
          const prevEntry = router.routingTable.get(dest);
          if (prevEntry && prevEntry.nextHop === neighborId) {
            bestNextHop = neighborId;
          }
        }
      }

      // Se nenhum vizinho tem rota válida (< infinity)
      if (minCost >= router.infinity) {
        minCost = router.infinity;
        bestNextHop = null;
      }

      // Detalhes da fórmula para visualização
      const termsStr = terms.length > 0
        ? terms.map(t => `[c(${router.label}, ${t.neighbor})=${t.linkCost} + D_${t.neighbor}(${dest})=${t.neighborDist >= router.infinity ? '∞' : t.neighborDist} => ${t.total >= router.infinity ? '∞' : t.total}]`).join('; ')
        : 'Nenhum vizinho ativo';

      const calcDetails = {
        formula: `D_${router.label}(${dest}) = min_v { c(${router.label}, v) + D_v(${dest}) }`,
        termsText: termsStr,
        terms: terms,
        chosen: bestNextHop,
        minCost: minCost
      };

      const previousEntry = router.routingTable.get(dest);
      const isChanged = !previousEntry || 
                        previousEntry.cost !== minCost || 
                        previousEntry.nextHop !== bestNextHop;

      if (isChanged) {
        changedCount++;
        updates.push({
          router: router.id,
          destination: dest,
          oldCost: previousEntry ? previousEntry.cost : null,
          newCost: minCost,
          oldNextHop: previousEntry ? previousEntry.nextHop : null,
          newNextHop: bestNextHop
        });
      }

      router.routingTable.set(dest, {
        destination: dest,
        cost: minCost,
        nextHop: bestNextHop,
        changed: isChanged,
        calculation: calcDetails
      });
    }

    return { changedCount, updates };
  }
}
