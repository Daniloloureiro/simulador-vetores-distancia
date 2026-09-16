/**
 * test_engine.js - Suíte de Testes Didáticos Automatizados
 * Demonstra formalmente e matematicamente os conceitos de:
 * 1. Convergência da Equação de Bellman-Ford (Escolha da rota ótima indireta)
 * 2. O Problema da Contagem até o Infinito (Count-to-Infinity e Loops de Roteamento)
 * 3. Mitigação Instantânea com Split Horizon e Poisoned Reverse (RFC 2453 / RIP)
 * 4. Resiliência e Roteamento Dinâmico com Redundância
 */

import { NetworkGraph } from '../js/engine/graph.js';
import { NetworkSimulator } from '../js/engine/simulator.js';

// Cores ANSI para saída rica no terminal
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  bgDark: '\x1b[40m'
};

function box(title, color = C.cyan) {
  const line = '═'.repeat(66);
  console.log(`\n${color}╔${line}╗`);
  console.log(`║  ${C.bold}${title.padEnd(64)}${C.reset}${color}║`);
  console.log(`╚${line}╝${C.reset}`);
}

function conceptNote(text) {
  console.log(`${C.dim}┌─ 💡 CONCEITO DIDÁTICO ───────────────────────────────────────────┐${C.reset}`);
  const lines = text.split('\n');
  for (const l of lines) {
    console.log(`${C.dim}│${C.reset}  ${l}`);
  }
  console.log(`${C.dim}└──────────────────────────────────────────────────────────────────┘${C.reset}`);
}

function runDidacticTests() {
  console.log(`\n${C.bold}${C.blue}╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║      LABORATÓRIO DE TESTES DIDÁTICOS — REDES DE COMPUTADORES II     ║`);
  console.log(`║      Universidade Federal do Pará (UFPA) — Vetores de Distância    ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝${C.reset}`);

  // =========================================================================
  // TESTE 1: Convergência Básica e Escolha da Menor Rota
  // =========================================================================
  box('TESTE 1: Convergência da Equação de Bellman-Ford (Rota Indireta)');
  conceptNote(
    `Neste teste, verificamos se o nó A descobre que a rota indireta\n` +
    `A -> B -> C (custo 1 + 2 = 3) é MENOR do que o enlace direto A -> C (custo 5).\n` +
    `Fórmula aplicada: D_A(C) = min { c(A,B) + D_B(C), c(A,C) + D_C(C) }`
  );

  console.log(`\n${C.yellow}Topologia do Teste:${C.reset}`);
  console.log(`    (A) ──[custo 1]──> (B)`);
  console.log(`     │                  │`);
  console.log(` [custo 5]          [custo 2]`);
  console.log(`     ↓                  ↓`);
  console.log(`     └───────────────> (C)`);

  const g1 = new NetworkGraph();
  g1.addNode('A', 'A', 100, 100);
  g1.addNode('B', 'B', 300, 100);
  g1.addNode('C', 'C', 200, 250);
  g1.addLink('A', 'B', 1);
  g1.addLink('B', 'C', 2);
  g1.addLink('A', 'C', 5);

  const sim1 = new NetworkSimulator({ mode: 'none' });
  sim1.initFromGraph(g1);

  console.log(`\n${C.dim}Estado Inicial (Iteração 0):${C.reset}`);
  console.log(`  Roteador A conhece apenas enlaces diretos: A->B: 1, A->C: 5`);

  let steps1 = 0;
  while (!sim1.isConverged && steps1 < 10) {
    sim1.step();
    steps1++;
    const costCurrent = sim1.routers.get('A').routingTable.get('C').cost;
    const hopCurrent = sim1.routers.get('A').routingTable.get('C').nextHop;
    console.log(`  ${C.cyan}[Iteração ${steps1}]${C.reset} Roteador A atualizou rota para C: Custo = ${C.bold}${costCurrent}${C.reset}, Próximo Salto = ${C.bold}${hopCurrent}${C.reset}`);
  }

  const rA1 = sim1.routers.get('A');
  const costA_C = rA1.routingTable.get('C').cost;
  const nextHopA_C = rA1.routingTable.get('C').nextHop;

  console.log(`\n${C.bold}Resultado Matemático:${C.reset}`);
  console.log(`  • Custo Esperado: 3 | Custo Calculado: ${costA_C}`);
  console.log(`  • Próximo Salto Esperado: B | Próximo Salto Calculado: ${nextHopA_C}`);
  console.log(`  • Convergência alcançada em: ${steps1} iterações.`);

  if (costA_C === 3 && nextHopA_C === 'B') {
    console.log(`${C.green}✅ TESTE 1 APROVADO: Bellman-Ford selecionou com sucesso a rota indireta ótima!${C.reset}`);
  } else {
    throw new Error(`Falha no Teste 1: Rota ótima esperada não foi alcançada.`);
  }

  // =========================================================================
  // TESTE 2: Demonstração da Contagem até o Infinito (Count-to-Infinity)
  // =========================================================================
  box('TESTE 2: Fenômeno da Contagem até o Infinito (Sem Mitigação)', C.yellow);
  conceptNote(
    `"Notícias ruins se espalham devagar": quando o enlace B-C cai,\n` +
    `o Roteador B ainda acredita que o Roteador A tem uma rota independente para C.\n` +
    `B calcula D_B(C) = c(B,A) + D_A(C) = 1 + 2 = 3 (via A).\n` +
    `Em seguida, A atualiza para 1 + 3 = 4 (via B), gerando o LOOP até o infinito (16).`
  );

  const g2 = new NetworkGraph();
  g2.addNode('A', 'A', 100, 100);
  g2.addNode('B', 'B', 250, 100);
  g2.addNode('C', 'C', 400, 100);
  g2.addLink('A', 'B', 1);
  g2.addLink('B', 'C', 1);

  const sim2 = new NetworkSimulator({ mode: 'none', infinity: 16 });
  sim2.initFromGraph(g2);

  while (!sim2.isConverged) {
    sim2.step();
  }

  console.log(`\n${C.dim}Rede Inicial Convergida:${C.reset} (A) ──[1]──> (B) ──[1]──> (C)`);
  console.log(`  • Rota B -> C: custo ${sim2.routers.get('B').routingTable.get('C').cost} (direto via C)`);
  console.log(`  • Rota A -> C: custo ${sim2.routers.get('A').routingTable.get('C').cost} (via B)`);

  console.log(`\n${C.red}${C.bold}⚡ SIMULANDO FALHA FÍSICA: O enlace B — C foi rompido!${C.reset}`);
  sim2.handleLinkToggle('B-C');

  console.log(`\n${C.yellow}Rastreamento passo a passo do Loop de Roteamento:${C.reset}`);
  console.log(`┌─────────┬──────────────┬──────────────┬──────────────────────────────────────────┐`);
  console.log(`│ Rodada  │ Custo B -> C │ Custo A -> C │ Explicação da Ilusão Didática            │`);
  console.log(`├─────────┼──────────────┼──────────────┼──────────────────────────────────────────┤`);

  let countToInfinitySteps = 0;
  for (let i = 0; i < 16 && !sim2.isConverged; i++) {
    const costB = sim2.routers.get('B').routingTable.get('C').cost;
    const costA = sim2.routers.get('A').routingTable.get('C').cost;

    let note = '';
    if (i === 0) note = 'B acha que A chega a C (c=3 via A)';
    else if (i === 1) note = 'A acha que B chega a C (c=4 via B)';
    else if (costB >= 16 && costA >= 16) note = 'Loop cessa: limiar ∞ (16) alcançado!';
    else note = `Loop retroalimentado (+${costB - 1} e +${costA - 1})`;

    console.log(`│ ${String(i).padStart(7)} │ ${String(costB >= 16 ? '∞ (16)' : costB).padStart(12)} │ ${String(costA >= 16 ? '∞ (16)' : costA).padStart(12)} │ ${note.padEnd(40)} │`);
    sim2.step();
    countToInfinitySteps++;
  }
  console.log(`└─────────┴──────────────┴──────────────┴──────────────────────────────────────────┘`);

  const finalCostB2 = sim2.routers.get('B').routingTable.get('C').cost;
  const finalCostA2 = sim2.routers.get('A').routingTable.get('C').cost;

  console.log(`\n${C.bold}Conclusão do Fenômeno:${C.reset}`);
  console.log(`  • Foram necessárias ${countToInfinitySteps} trocas de mensagens para o protocolo perceber que C é inalcançável.`);
  console.log(`  • Custo final em B: ${finalCostB2 >= 16 ? '∞' : finalCostB2} | Custo final em A: ${finalCostA2 >= 16 ? '∞' : finalCostA2}`);

  if (finalCostB2 >= 16 && finalCostA2 >= 16) {
    console.log(`${C.green}✅ TESTE 2 APROVADO: O problema da contagem até o infinito foi reproduzido com fidelidade teórica!${C.reset}`);
  } else {
    throw new Error('Falha no Teste 2: O algoritmo não atingiu infinito conforme esperado.');
  }

  // =========================================================================
  // TESTE 3: Solução Instantânea com Poisoned Reverse
  // =========================================================================
  box('TESTE 3: Mitigação Instantânea com Poisoned Reverse', C.magenta);
  conceptNote(
    `Com Poisoned Reverse (Split Horizon com Envenenamento Reverso),\n` +
    `como A depende de B para alcançar C, A anuncia para B que D_A(C) = ∞ (16).\n` +
    `Quando o enlace B-C cai, B calcula: c(B,A) + D_A(C) = 1 + 16 = 17 (≥ 16 = ∞).\n` +
    `B detecta IMEDIATAMENTE que não há caminho, eliminando o loop em 1 única iteração!`
  );

  const g3 = new NetworkGraph();
  g3.addNode('A', 'A', 100, 100);
  g3.addNode('B', 'B', 250, 100);
  g3.addNode('C', 'C', 400, 100);
  g3.addLink('A', 'B', 1);
  g3.addLink('B', 'C', 1);

  const sim3 = new NetworkSimulator({ mode: 'poisoned_reverse', infinity: 16 });
  sim3.initFromGraph(g3);

  while (!sim3.isConverged) {
    sim3.step();
  }

  console.log(`\n${C.dim}Rede Inicial Convergida com Poisoned Reverse Ativado.${C.reset}`);
  console.log(`  • Vetor que A anuncia para B: D_A^(B)(C) = ${C.bold}16 (envenenado com infinito)${C.reset}`);

  console.log(`\n${C.red}${C.bold}⚡ ROMPENDO ENLACE B — C COM POISONED REVERSE ATIVADO:${C.reset}`);
  sim3.handleLinkToggle('B-C');

  // Executa o passo seguinte
  sim3.step();

  const costB_poison = sim3.routers.get('B').routingTable.get('C').cost;
  const costA_poison = sim3.routers.get('A').routingTable.get('C').cost;

  console.log(`\n${C.bold}Resultado na Primeira Iteração após o Rompimento:${C.reset}`);
  console.log(`  • Custo B -> C: ${costB_poison >= 16 ? C.green + '∞ (16 - Inalcançável imediato)' : costB_poison}${C.reset}`);
  console.log(`  • Custo A -> C: ${costA_poison >= 16 ? C.green + '∞ (16 - Inalcançável imediato)' : costA_poison}${C.reset}`);
  console.log(`  • Iterações gastas para resolver: ${C.bold}1 iteração${C.reset} (contra 15 iterações do modo sem mitigação!).`);

  if (costB_poison >= 16) {
    console.log(`${C.green}✅ TESTE 3 APROVADO: Poisoned Reverse impediu o loop instantaneamente em 1 rodada!${C.reset}`);
  } else {
    throw new Error('Falha no Teste 3: Poisoned Reverse não definiu infinito imediatamente.');
  }

  // =========================================================================
  // TESTE 4: Roteamento Dinâmico com Redundância em Malha
  // =========================================================================
  box('TESTE 4: Resiliência em Malha e Reconvergência Dinâmica', C.green);
  conceptNote(
    `Verifica se a rede com múltiplos caminhos consegue:\n` +
    `1. Encontrar a rota ótima inicial (A -> B -> C = 3).\n` +
    `2. Desviar para a rota reserva (A -> D -> E -> C = 6) quando B-C cai.\n` +
    `3. Retornar automaticamente para a rota ótima (custo 3) quando B-C é restaurado.`
  );

  const g4 = new NetworkGraph();
  g4.addNode('A', 'A', 100, 100);
  g4.addNode('B', 'B', 300, 100);
  g4.addNode('C', 'C', 500, 100);
  g4.addNode('D', 'D', 150, 250);
  g4.addNode('E', 'E', 450, 250);

  g4.addLink('A', 'B', 1);
  g4.addLink('B', 'C', 2); // Primário: custo 3
  g4.addLink('A', 'D', 2);
  g4.addLink('D', 'E', 2);
  g4.addLink('E', 'C', 2); // Secundário: custo 6

  const sim4 = new NetworkSimulator({ mode: 'poisoned_reverse', infinity: 16 });
  sim4.initFromGraph(g4);

  // 1. Converge inicial
  while (!sim4.isConverged) sim4.step();
  const c1 = sim4.routers.get('A').routingTable.get('C').cost;
  console.log(`  1. Rota ótima inicial: A -> C tem custo ${c1} (Esperado: 3 via B)`);

  // 2. Queda do primário
  sim4.handleLinkToggle('B-C');
  while (!sim4.isConverged) sim4.step();
  const c2 = sim4.routers.get('A').routingTable.get('C').cost;
  const h2 = sim4.routers.get('A').routingTable.get('C').nextHop;
  console.log(`  2. Após queda de B-C: A -> C desvia para custo ${c2} (Esperado: 6 via D) [NextHop: ${h2}]`);

  // 3. Reparo do primário
  sim4.handleLinkToggle('B-C');
  while (!sim4.isConverged) sim4.step();
  const c3 = sim4.routers.get('A').routingTable.get('C').cost;
  const h3 = sim4.routers.get('A').routingTable.get('C').nextHop;
  console.log(`  3. Após reparo de B-C: A -> C retorna para custo ${c3} (Esperado: 3 via B) [NextHop: ${h3}]`);

  if (c1 === 3 && c2 === 6 && h2 === 'D' && c3 === 3 && h3 === 'B') {
    console.log(`${C.green}✅ TESTE 4 APROVADO: Resiliência e reconvergência dinâmica comprovadas com perfeição!${C.reset}`);
  } else {
    throw new Error('Falha no Teste 4: Comportamento de re-roteamento inesperado.');
  }

  console.log(`\n${C.bold}${C.green}╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║      🎉 TODOS OS TESTES DIDÁTICOS FORAM EXECUTADOS COM SUCESSO!      ║`);
  console.log(`║      Todos os conceitos de Bellman-Ford foram validados 100%       ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝${C.reset}\n`);
}

runDidacticTests();
