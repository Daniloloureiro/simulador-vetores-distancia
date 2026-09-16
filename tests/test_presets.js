/**
 * test_presets.js - Validação Automatizada das Simulações Pré-Prontas e Storyboards
 */

import { PRESETS } from '../js/data/presets.js';
import { NetworkGraph } from '../js/engine/graph.js';
import { NetworkSimulator } from '../js/engine/simulator.js';

function validatePresets() {
  console.log('====================================================');
  console.log(`VALIDAÇÃO DE PRESETS: ${PRESETS.length} Simulações Pré-Prontas`);
  console.log('====================================================');

  for (const preset of PRESETS) {
    console.log(`\nVerificando preset: [${preset.id}] ${preset.title}...`);

    if (!preset.nodes || preset.nodes.length === 0) {
      throw new Error(`Preset ${preset.id} não possui nós definidos.`);
    }
    if (!preset.links || preset.links.length === 0) {
      throw new Error(`Preset ${preset.id} não possui enlaces definidos.`);
    }
    if (!preset.storyboard || preset.storyboard.length === 0) {
      throw new Error(`Preset ${preset.id} não possui storyboard definido.`);
    }

    // Testa construção do grafo
    const g = new NetworkGraph();
    const nodeIds = new Set();
    for (const n of preset.nodes) {
      g.addNode(n.id, n.label, n.x, n.y);
      nodeIds.add(n.id);
    }

    for (const l of preset.links) {
      if (!nodeIds.has(l.source) || !nodeIds.has(l.target)) {
        throw new Error(`Preset ${preset.id} possui enlace com nó inexistente: ${l.source} -> ${l.target}`);
      }
      g.addLink(l.source, l.target, l.weight);
    }

    // Testa inicialização do simulador
    const sim = new NetworkSimulator({ mode: preset.mode, infinity: preset.infinity || 16 });
    sim.initFromGraph(g);

    // Valida etapas do storyboard
    for (let i = 0; i < preset.storyboard.length; i++) {
      const step = preset.storyboard[i];
      if (!step.stepTitle || !step.narration || !step.action) {
        throw new Error(`Preset ${preset.id}, etapa ${i} incompleta.`);
      }
      if (step.highlightNode && !nodeIds.has(step.highlightNode)) {
        throw new Error(`Preset ${preset.id}, etapa ${i} referencia highlightNode inexistente: ${step.highlightNode}`);
      }
      if (step.highlightDest && !nodeIds.has(step.highlightDest)) {
        throw new Error(`Preset ${preset.id}, etapa ${i} referencia highlightDest inexistente: ${step.highlightDest}`);
      }
    }

    console.log(`✅ Preset "${preset.title}": ${preset.nodes.length} nós, ${preset.links.length} enlaces, ${preset.storyboard.length} etapas do storyboard validadas com sucesso!`);
  }

  console.log('\n====================================================');
  console.log('🎉 TODAS AS 6 SIMULAÇÕES PRÉ-PRONTAS ESTÃO 100% VÁLIDAS!');
  console.log('====================================================');
}

validatePresets();
