/**
 * presets.js - Biblioteca de Simulações Pré-Prontas com Storyboards Didáticos
 * Cada simulação inclui a topologia inicial e uma sequência guiada de etapas (storyboard)
 * com narração explicativa para conduzir apresentações acadêmicas na íntegra.
 */

export const PRESETS = [
  {
    id: 'basic_triangle',
    title: '1. Convergência Básica (Triângulo A-B-C)',
    badge: 'Iniciante',
    description: 'Demonstra a descoberta inicial da rede e como o Roteador A prefere o caminho indireto A -> B -> C (custo 1 + 2 = 3) em vez do enlace direto A -> C (custo 5).',
    mode: 'none',
    infinity: 16,
    nodes: [
      { id: 'A', label: 'Roteador A', x: 180, y: 150 },
      { id: 'B', label: 'Roteador B', x: 450, y: 150 },
      { id: 'C', label: 'Roteador C', x: 315, y: 340 }
    ],
    links: [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 2 },
      { source: 'A', target: 'C', weight: 5 }
    ],
    storyboard: [
      {
        stepTitle: 'Etapa 1: Estado Inicial da Rede',
        narration: 'No início (Iteração 0), cada roteador conhece apenas seus enlaces diretos imediatos. Note nas tabelas: o Roteador A sabe que B custa 1 e C custa 5 diretamente.',
        action: 'init',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 2: Primeira Troca de Vetores',
        narration: 'Os roteadores transmitem seus vetores locais para seus vizinhos. O Roteador B avisa para A que alcança C com custo 2. Observe os pacotes cruzando os enlaces!',
        action: 'step',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 3: Cálculo da Equação de Bellman-Ford',
        narration: 'O Roteador A aplica a fórmula: D_A(C) = min { c(A,B) + D_B(C), c(A,C) + D_C(C) } = min { 1 + 2, 5 + 0 } = 3. O caminho indireto via B é mais barato que o enlace direto de custo 5!',
        action: 'inspect',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 4: Convergência Total da Rede',
        narration: 'Com mais uma troca de vetores, todos os nós confirmam as menores rotas. Nenhuma tabela é alterada, e a rede entra em estado CONVERGIDO.',
        action: 'step',
        highlightNode: 'A',
        highlightDest: 'C'
      }
    ]
  },
  {
    id: 'count_to_infinity',
    title: '2. Contagem até o Infinito (Count-to-Infinity Completo)',
    badge: 'Problema Clássico',
    description: 'Simulação clássica da falha no enlace B — C gerando o loop de roteamento e a subida progressiva dos custos até 16.',
    mode: 'none',
    infinity: 16,
    nodes: [
      { id: 'A', label: 'Roteador A', x: 160, y: 220 },
      { id: 'B', label: 'Roteador B', x: 360, y: 220 },
      { id: 'C', label: 'Roteador C', x: 560, y: 220 }
    ],
    links: [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 1 }
    ],
    storyboard: [
      {
        stepTitle: 'Etapa 1: Rede Estável Prévia',
        narration: 'A rede linear A — B — C está perfeitamente convergida. O Roteador B alcança C com custo 1 (direto), e o Roteador A alcança C com custo 2 (via B).',
        action: 'converge',
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 2: Ocorre a Falha Física (Link Down)',
        narration: 'O cabo entre B e C é rompido! O Roteador B detecta a perda imediata do enlace físico. Porém, B lembra que A havia anunciado anteriormente ter custo 2 para C.',
        action: 'break_link',
        targetLink: 'B-C',
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 3: Ilusão de Rota Alternativa (B escolhe A)',
        narration: 'B calcula: D_B(C) = c(B,A) + D_A(C) = 1 + 2 = 3 (via A). B acredita erroneamente que A tem um caminho independente para C, gerando um loop de roteamento!',
        action: 'step',
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 4: Propagação do Loop para o Roteador A',
        narration: 'B avisa A que seu custo para C agora é 3. Como a rota de A passa por B, A atualiza seu custo para D_A(C) = 1 + 3 = 4 (via B). A ilusão se retroalimenta!',
        action: 'step',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 5: Ciclo Contínuo de Contagem até o Infinito',
        narration: 'A cada iteração, A e B incrementam o custo (+1, +2, +3...). Esse é o fenômeno da Contagem até o Infinito ("notícias ruins se espalham devagar"). Vamos avançar o loop!',
        action: 'step_repeat',
        repeatCount: 12,
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 6: Término no Infinito (Métrica 16 do RIP)',
        narration: 'O loop só termina quando a métrica atinge 16 (definida como infinito no protocolo RIP). Apenas agora os roteadores declaram o destino C como inalcançável!',
        action: 'step',
        highlightNode: 'B',
        highlightDest: 'C'
      }
    ]
  },
  {
    id: 'poisoned_reverse_demo',
    title: '3. Solução Eficaz com Poisoned Reverse',
    badge: 'Mitigação',
    description: 'Demonstração de como a técnica Split Horizon com Poisoned Reverse evita loops instantaneamente após uma queda de enlace.',
    mode: 'poisoned_reverse',
    infinity: 16,
    nodes: [
      { id: 'A', label: 'Roteador A', x: 160, y: 220 },
      { id: 'B', label: 'Roteador B', x: 360, y: 220 },
      { id: 'C', label: 'Roteador C', x: 560, y: 220 }
    ],
    links: [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 1 }
    ],
    storyboard: [
      {
        stepTitle: 'Etapa 1: Rede Convergida com Poisoned Reverse',
        narration: 'A rede opera com Poisoned Reverse ativado. Como o Roteador A usa B para alcançar C, A anuncia para B: "Minha distância para C é INFINITA (16)" para evitar que B confie nele.',
        action: 'converge',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 2: Rompimento do Enlace B — C',
        narration: 'O cabo entre B e C é cortado. O Roteador B precisa reavaliar suas rotas para C. Desta vez, B olha para o vetor de A e vê que a distância anunciada já era 16 (infinita)!',
        action: 'break_link',
        targetLink: 'B-C',
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 3: Resolução Imediata em 1 Salto',
        narration: 'B calcula: c(B,A) + D_A(C) = 1 + 16 = 17 (≥ 16 = ∞). B sabe imediatamente que NÃO existe caminho para C! O custo vai direto para infinito sem nenhum loop!',
        action: 'step',
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 4: Estabilização sem Desperdício',
        narration: 'B avisa A que C é inalcançável. Em apenas 1 iteração a rede se estabiliza, poupando largura de banda e evitando que pacotes fiquem rodando em círculos.',
        action: 'step',
        highlightNode: 'A',
        highlightDest: 'C'
      }
    ]
  },
  {
    id: 'dynamic_rerouting',
    title: '4. Roteamento Dinâmico & Recuperação de Falha (Malha)',
    badge: 'Resiliência',
    description: 'Rede em malha com caminho principal e alternativo. Demonstra desvio dinâmico de tráfego após queda e reconvergência após o reparo do cabo.',
    mode: 'poisoned_reverse',
    infinity: 16,
    nodes: [
      { id: 'A', label: 'Roteador A', x: 160, y: 150 },
      { id: 'B', label: 'Roteador B', x: 380, y: 110 },
      { id: 'C', label: 'Roteador C', x: 600, y: 150 },
      { id: 'D', label: 'Roteador D', x: 230, y: 340 },
      { id: 'E', label: 'Roteador E', x: 520, y: 340 }
    ],
    links: [
      { source: 'A', target: 'B', weight: 1 },
      { source: 'B', target: 'C', weight: 2 }, // Caminho primário A -> B -> C = custo 3
      { source: 'A', target: 'D', weight: 2 },
      { source: 'D', target: 'E', weight: 2 },
      { source: 'E', target: 'C', weight: 2 }, // Caminho secundário A -> D -> E -> C = custo 6
      { source: 'B', target: 'E', weight: 4 }
    ],
    storyboard: [
      {
        stepTitle: 'Etapa 1: Topologia em Malha Convergida',
        narration: 'A rede encontra a rota ótima de A para C via B: A -> B -> C (custo 1 + 2 = 3). O caminho alternativo pelo sul (A -> D -> E -> C) custa 6 e fica como reserva.',
        action: 'converge',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 2: Queda do Enlace Primário (B — C)',
        narration: 'O enlace principal entre B e C é cortado! O caminho mais curto foi interrompido.',
        action: 'break_link',
        targetLink: 'B-C',
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 3: Descoberta da Rota de Contingência',
        narration: 'Os vetores são trocados. O Roteador B avisa a perda do enlace e a rede recalcula rotas. Observe o tráfego sendo desviado pelo caminho alternativo (via D e E)!',
        action: 'step',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 4: Nova Rota Estável',
        narration: 'O Roteador A agora alcança C com custo 6 através do caminho reserva A -> D -> E -> C. A rede continuou funcionando mesmo com a perda do enlace principal!',
        action: 'step',
        highlightNode: 'A',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 5: Reparo e Restauração do Cabo B — C',
        narration: 'A equipe de infraestrutura repara o cabo B — C (enlace restabelecido). O que acontece com a rede agora?',
        action: 'restore_link',
        targetLink: 'B-C',
        highlightNode: 'B',
        highlightDest: 'C'
      },
      {
        stepTitle: 'Etapa 6: Reconvergência Automática para a Rota Ótima',
        narration: '"Boas notícias se espalham rápido": B avisa que o enlace direto de custo 2 voltou. Imediatamente, A restaura sua rota ótima para C via B (custo 3)!',
        action: 'step',
        highlightNode: 'A',
        highlightDest: 'C'
      }
    ]
  },
  {
    id: 'kurose_ross_classic',
    title: '5. Exemplo Canônico de Kurose & Ross (Livro-Texto)',
    badge: 'Acadêmico',
    description: 'Topologia canônica de 6 nós (u, v, x, y, z, w) do livro "Redes de Computadores e a Internet" de Kurose & Ross (Capítulo 5).',
    mode: 'poisoned_reverse',
    infinity: 16,
    nodes: [
      { id: 'U', label: 'Roteador u', x: 150, y: 220 },
      { id: 'V', label: 'Roteador v', x: 300, y: 120 },
      { id: 'W', label: 'Roteador w', x: 300, y: 320 },
      { id: 'X', label: 'Roteador x', x: 470, y: 120 },
      { id: 'Y', label: 'Roteador y', x: 470, y: 320 },
      { id: 'Z', label: 'Roteador z', x: 620, y: 220 }
    ],
    links: [
      { source: 'U', target: 'V', weight: 2 },
      { source: 'U', target: 'W', weight: 5 },
      { source: 'U', target: 'X', weight: 1 },
      { source: 'V', target: 'X', weight: 2 },
      { source: 'V', target: 'W', weight: 3 },
      { source: 'W', target: 'X', weight: 3 },
      { source: 'W', target: 'Y', weight: 1 },
      { source: 'X', target: 'Y', weight: 1 },
      { source: 'X', target: 'Z', weight: 3 },
      { source: 'Y', target: 'Z', weight: 2 }
    ],
    storyboard: [
      {
        stepTitle: 'Etapa 1: Topologia Canônica de Kurose & Ross',
        narration: 'Esta é a clássica topologia do Capítulo 5 de Kurose & Ross. Observe os múltiplos caminhos possíveis entre o Roteador u e o Roteador z.',
        action: 'init',
        highlightNode: 'U',
        highlightDest: 'Z'
      },
      {
        stepTitle: 'Etapa 2: Propagação Inicial de Informações',
        narration: 'Os nós trocam seus vetores de distância iniciais. U descobre caminhos indiretos através de x e v.',
        action: 'step',
        highlightNode: 'U',
        highlightDest: 'Z'
      },
      {
        stepTitle: 'Etapa 3: Cálculo da Rota Ótima u -> z',
        narration: 'Bellman-Ford avalia os caminhos: via X, via V, via W. A rota ótima calculada para z é u -> x -> y -> z com custo total 1 + 1 + 2 = 4!',
        action: 'step',
        highlightNode: 'U',
        highlightDest: 'Z'
      },
      {
        stepTitle: 'Etapa 4: Convergência Completa do Sistema Autônomo',
        narration: 'Todas as tabelas de roteamento dos 6 nós atingem o estado estável. Nenhuma rota melhor pode ser descoberta.',
        action: 'step',
        highlightNode: 'U',
        highlightDest: 'Z'
      }
    ]
  },
  {
    id: 'ufpa_campus',
    title: '6. Rede do Campus Universitário UFPA (Belém)',
    badge: 'Aplicação Real',
    description: 'Simulação temática com a infraestrutura de fibra óptica da UFPA conectando Reitoria, Básico, Profissional, Mirante do Rio e CTIC.',
    mode: 'poisoned_reverse',
    infinity: 16,
    nodes: [
      { id: 'REIT', label: 'Reitoria (Campus I)', x: 150, y: 150 },
      { id: 'BAS', label: 'Setor Básico', x: 380, y: 120 },
      { id: 'PROF', label: 'Setor Profissional', x: 230, y: 340 },
      { id: 'MIR', label: 'Mirante do Rio', x: 450, y: 340 },
      { id: 'CTIC', label: 'Datacenter / CTIC', x: 620, y: 220 }
    ],
    links: [
      { source: 'REIT', target: 'BAS', weight: 1 },
      { source: 'REIT', target: 'PROF', weight: 2 },
      { source: 'BAS', target: 'MIR', weight: 2 },
      { source: 'BAS', target: 'CTIC', weight: 1 }, // Backbone direto Básico <-> CTIC
      { source: 'PROF', target: 'MIR', weight: 1 },
      { source: 'MIR', target: 'CTIC', weight: 3 }
    ],
    storyboard: [
      {
        stepTitle: 'Etapa 1: Infraestrutura de Rede do Campus UFPA',
        narration: 'Topologia representando o campus da UFPA em Belém. Todos os setores comunicam-se com o Datacenter Central (CTIC).',
        action: 'converge',
        highlightNode: 'REIT',
        highlightDest: 'CTIC'
      },
      {
        stepTitle: 'Etapa 2: Rota Principal Reitoria -> Datacenter',
        narration: 'A Reitoria acessa o Datacenter/CTIC através do Setor Básico: REIT -> BAS -> CTIC com custo total 1 + 1 = 2.',
        action: 'inspect',
        highlightNode: 'REIT',
        highlightDest: 'CTIC'
      },
      {
        stepTitle: 'Etapa 3: Queda da Fibra Óptica (BAS <-> CTIC)',
        narration: 'Ocorre um rompimento na fibra óptica entre o Setor Básico e o Datacenter CTIC (obra na via principal).',
        action: 'break_link',
        targetLink: 'BAS-CTIC',
        highlightNode: 'BAS',
        highlightDest: 'CTIC'
      },
      {
        stepTitle: 'Etapa 4: Re-roteamento pelo Mirante do Rio',
        narration: 'O algoritmo de Bellman-Ford recalcula as rotas dinamicamente. O tráfego para o CTIC passa agora pelo Mirante do Rio (BAS -> MIR -> CTIC). A universidade não fica sem conexão!',
        action: 'step',
        highlightNode: 'REIT',
        highlightDest: 'CTIC'
      }
    ]
  }
];
