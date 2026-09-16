# 🌐 Simulador Interativo de Vetores de Distância (Bellman-Ford / RIP)
### Universidade Federal do Pará (UFPA) — Redes de Computadores II

Aplicação web interativa para demonstração visual, matemática e experimental do algoritmo de **Vetores de Distância (Distance Vector)**, a equação de **Bellman-Ford**, o problema da **Contagem até o Infinito (*Count-to-Infinity*)** e as técnicas de mitigação **Split Horizon** e **Poisoned Reverse** (base do protocolo **RIP - RFC 2453**).

---

## 📸 Funcionalidades do Projeto

* 🎮 **Topologia Totalmente Interativa (Canvas 60 FPS)**:
  * Arraste roteadores livremente pela tela.
  * **Clique em qualquer enlace** para simular corte/queda do cabo (Link Failure) em tempo real.
  * **Shift + Clique no enlace** para editar o custo/métrica da rota.
  * Botões para adicionar novos roteadores e enlaces personalizados.
* 📦 **Animação Fluida de Pacotes em Trânsito**:
  * Visualização de mensagens e vetores trafegando pelos cabos com selos indicando o vetor transmitido.
  * Efeitos de impacto e partículas quando pacotes chegam aos nós de destino.
* 📊 **Tabelas de Roteamento Dinâmicas**:
  * Exibição das tabelas de todos os roteadores lado a lado com Destino, Métrica e Próximo Salto (*Next Hop*).
  * Destaque visual colorido: verde para rotas aprendidas/melhoradas e vermelho para rotas inalcançáveis ($\infty$).
* 🔬 **Inspetor Matemático de Bellman-Ford**:
  * Clique em qualquer linha de tabela ou roteador para abrir a fórmula detalhada:
    $$D_x(y) = \min_v \{ c(x, v) + D_v(y) \}$$
  * Tabela com todos os vizinhos $v$, custo do enlace $c(x, v)$, distância informada $D_v(y)$, soma total e destaque da rota ótima escolhida.
* 🎬 **6 Simulações Pré-Prontas com Storyboards Narrados (Apresentação Guiada)**:
  1. **Convergência Básica (Triângulo A-B-C)**: Descoberta inicial, troca de vetores e escolha do caminho indireto $A \to B \to C$ (custo 3 vs 5).
  2. **Contagem até o Infinito (Count-to-Infinity Completo)**: Queda do enlace $B-C$ sem mitigação, gerando o loop de roteamento com custos subindo até 16.
  3. **Solução Eficaz com Poisoned Reverse**: Mesma quebra de cabo, mas com Poisoned Reverse, resolvendo o problema em apenas 1 iteração.
  4. **Roteamento Dinâmico & Recuperação de Falha (Malha)**: Desvio para rota secundária durante corte e reconvergência automática após o reparo.
  5. **Exemplo Canônico de Kurose & Ross (Livro-Texto)**: Topologia exata de 6 nós do Capítulo 5 do livro de redes.
  6. **Rede do Campus Universitário UFPA (Belém)**: Reitoria, Setor Básico, Setor Profissional, Mirante do Rio e Datacenter / CTIC.
* 🎙️ **Player de Apresentação Integrado**:
  * Botões "▶ Tocar Demonstração", "⏮ Anterior", "⏭ Próxima Etapa" e barra de progresso visual.
  * Caixa de narração com linguagem clara para leitura direta durante a apresentação.

---

## 🚀 Como Executar

O projeto foi construído em **HTML5, CSS3 moderno e JavaScript ES6 puro (modular)**, sem necessidade de compilação ou instalação de dependências pesadas (`node_modules`).

### Opção 1: Abrir diretamente no navegador (Zero Configuração)
Basta dar um duplo clique no arquivo [`index.html`](file:///home/eclipse/Documents/UFPA/Redes%20II/index.html) ou abri-lo no seu navegador preferido (Google Chrome, Mozilla Firefox, Microsoft Edge ou Safari).

### Opção 2: Via servidor local simples
Se desejar executar através de um servidor HTTP local:
```bash
# Com Python 3:
python3 -m http.server 8080

# Ou com Node.js:
npx serve .
```
Em seguida, acesse no navegador: `http://localhost:8080`.

---

## 🧪 Testes Automatizados da Lógica

O motor do algoritmo possui uma suíte de testes formais em Node.js que valida matematicamente a convergência, a ocorrência exata da contagem até o infinito e o bloqueio de loops pelo Poisoned Reverse:

```bash
node tests/test_engine.js
```

---

## 📖 Fundamentação Teórica Resumida

### 1. A Equação de Bellman-Ford
No algoritmo de Vetores de Distância, cada roteador $x$ mantém um vetor de estimativas de menor custo para todos os destinos $y \in N$. Periodicamente, ou quando os custos mudam, cada nó envia seu vetor para seus vizinhos imediatos.

Ao receber o vetor $D_v$ de um vizinho $v$, o roteador $x$ atualiza sua própria tabela utilizando a equação de Bellman-Ford:
$$D_x(y) = \min_v \{ c(x, v) + D_v(y) \}$$
onde:
- $c(x, v)$ é o custo do enlace direto de $x$ para $v$.
- $D_v(y)$ é o custo informado pelo vizinho $v$ para alcançar o destino $y$.

### 2. O Problema da Contagem até o Infinito (*Count-to-Infinity*)
* "Boas notícias se espalham rápido": a descoberta de um novo caminho menor converge em poucos passos.
* "Más notícias se espalham devagar": considere a rede $A - B - C$, com enlaces de custo 1.
  - Inicialmente, $B$ chega a $C$ com custo 1 (direto), e $A$ chega a $C$ com custo 2 (via $B$).
  - Se o enlace $B-C$ é rompido, $B$ precisa recalcular a rota para $C$.
  - Como $A$ havia anunciado que chegava a $C$ com custo 2, $B$ pensa: *"Posso ir até $C$ passando por $A$ com custo $1 + 2 = 3$!"*.
  - No passo seguinte, $A$ vê que $B$ agora tem custo 3, e atualiza o seu próprio para $1 + 3 = 4$.
  - Esse processo se repete ($5, 6, 7 \dots$) até atingir o limiar de infinito ($\infty = 16$). Durante todo esse tempo, pacotes destinados a $C$ ficam presos em um loop eterno entre $A$ e $B$.

### 3. Técnicas de Mitigação
* **Split Horizon (Horizonte Dividido)**: Um roteador nunca anuncia uma rota de volta para o vizinho de quem ele aprendeu essa rota.
* **Poisoned Reverse (Envenenamento Reverso)**: Se o roteador $A$ roteia para $C$ passando por $B$, $A$ anuncia explicitamente para $B$ que sua distância para $C$ é **infinita** ($D_A^{(B)}(C) = \infty$). Assim, quando o enlace $B-C$ cai, $B$ sabe imediatamente que $A$ não pode ser usado como rota alternativa para $C$, eliminando o loop na hora!

---

## 🎤 Roteiro Sugerido para Apresentação Oral

Utilize este roteiro passo a passo durante a apresentação para o professor e seus colegas:

```
[MINUTO 0:00 - 1:30] INTRODUÇÃO
1. "Boa noite a todos. Nosso trabalho demonstra de forma interativa e visual o algoritmo
   de Vetores de Distância, baseado na equação de Bellman-Ford e utilizado no protocolo RIP."
2. Mostre a tela inicial do simulador no projetor.
3. Aponte a fórmula de Bellman-Ford destacada no painel superior direito.

[MINUTO 1:30 - 3:30] CENÁRIO 1: CONVERGÊNCIA BÁSICA
1. Selecione o "Cenário 1: Convergência Básica (Triângulo)".
2. Clique no botão "⏭ Avançar 1 Passo":
   - Mostre as bolinhas coloridas viajando pelos cabos carregando os vetores [dest: custo].
   - Mostre a tabela do Roteador A atualizando: ele tinha enlace direto para C com custo 5,
     mas ao receber o vetor de B (custo 2) somado ao enlace c(A,B)=1, calcula 1+2=3.
3. Clique no nó A e abra o "Inspetor Matemático":
   - Mostre a tabela de termos destacando a comparação:
     min { c(A,B) + D_B(C) = 1 + 2 = 3 ; c(A,C) + D_C(C) = 5 + 0 = 5 } = 3.

[MINUTO 3:30 - 6:00] CENÁRIO 2: CONTAGEM ATÉ O INFINITO (O Ponto Alto da Apresentação)
1. Selecione o "Cenário 2: Contagem até o Infinito".
2. Mostre que a rede está convergida: A->B->C.
3. Diga: "Agora vamos simular uma falha física: o cabo entre B e C foi cortado".
4. Clique no botão vermelho "⚡ Simular Queda do Enlace B — C" (ou clique direto no cabo).
   - O cabo fica vermelho tracejado com um ✕.
5. Avance os passos (ou aperte Play com velocidade 1x):
   - Aponte a tabela: "Vejam o custo subindo: 3, 4, 5, 6, 7...".
   - Explique por que ocorre: "B acha que A chega a C, e A acha que B chega a C.
     Eles criaram um loop de roteamento que só para quando a métrica atinge 16 (infinito do RIP)".

[MINUTO 6:00 - 8:00] CENÁRIO 3: SOLUÇÃO COM POISONED REVERSE
1. Selecione o "Cenário 3: Solução com Poisoned Reverse".
2. Explique: "Aqui ativamos o Poisoned Reverse. Como A usa B para chegar a C,
   A mente para B dizendo que sua distância para C é 16 (infinita)".
3. Clique novamente em "⚡ Simular Queda do Enlace B — C".
4. Avance 1 Passo:
   - Mostre que B não entra em loop, pois sabe que via A é infinito.
   - A rota é marcada imediatamente com ∞ em 1 único passo.
   - "O loop foi completamente evitado graças ao envenenamento reverso".

[MINUTO 8:00 - 10:00] INTERATIVIDADE LIVRE & CONCLUSÃO
1. Arraste nós, mostre o Cenário 4 (Rede em Malha com 5 nós) para demonstrar redundância.
2. Abra para perguntas do professor e turma.
```

---

## 📁 Estrutura de Arquivos

```
Redes II/
├── index.html              # Interface web principal da aplicação
├── package.json            # Metadados do projeto e script de testes
├── README.md               # Documentação acadêmica e roteiro de apresentação
├── css/
│   ├── style.css           # Grid, layout responsivo e tema escuro
│   └── components.css      # Estilização de botões, tabelas e inspetor de fórmulas
├── js/
│   ├── app.js              # Ponto de entrada e conexão entre módulos
│   ├── engine/
│   │   ├── graph.js        # Grafo de nós e enlaces com status ativo/quebrado
│   │   ├── router.js       # Estado individual e tabelas de cada roteador
│   │   ├── bellman_ford.js # Algoritmo formal de Bellman-Ford e decomposição de termos
│   │   └── simulator.js    # Fila de eventos, rounds de simulação e convergência
│   ├── visualizer/
│   │   ├── canvas.js       # Renderizador Canvas 2D a 60 FPS com arrasto e HiDPI
│   │   └── animations.js   # Interpolação de pacotes e sistema de partículas
│   ├── ui/
│   │   ├── controls.js     # Controles (Play/Pause/Step/Speed/Presets)
│   │   ├── tables_view.js  # Renderizador das tabelas com realce de alterações
│   │   └── inspector.js    # Inspetor matemático passo a passo da equação
│   └── data/
│       └── presets.js      # Cenários didáticos pré-configurados
└── tests/
    └── test_engine.js      # Testes automatizados formais
```

---

## 📚 Referências Bibliográficas
1. **KUROSE, James F.; ROSS, Keith W.** *Redes de Computadores e a Internet: Uma Abordagem Top-Down*. 7ª Edição. Pearson, 2017. (Capítulo 5: A Camada de Rede - Plano de Controle).
2. **TANENBAUM, Andrew S.; WETHERALL, David.** *Redes de Computadores*. 5ª Edição. Pearson, 2011. (Seção 5.2.4: Roteamento por Vetor de Distâncias).
3. **MALKIN, G.** *RIP Version 2 (RFC 2453)*. Network Working Group, IETF, 1998.
