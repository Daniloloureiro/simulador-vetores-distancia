/**
 * app.js - Ponto de Entrada Principal da Aplicação
 * Orquestra a inicialização do motor, canvas, painéis de UI e controles.
 */

import { NetworkSimulator } from './engine/simulator.js';
import { TopologyCanvas } from './visualizer/canvas.js';
import { TablesView } from './ui/tables_view.js';
import { MathInspector } from './ui/inspector.js';
import { SimulationControls } from './ui/controls.js';
import { GuidedTourPlayer } from './ui/guided_tour.js';
import { TestRunnerModal } from './ui/test_runner_modal.js';

document.addEventListener('DOMContentLoaded', () => {
  // 1. Instancia o Simulador
  const simulator = new NetworkSimulator({
    mode: 'none',
    infinity: 16
  });

  // 2. Elementos da Interface
  const canvasEl = document.getElementById('network-canvas');
  const tablesContainer = document.getElementById('tables-container');
  const inspectorContainer = document.getElementById('inspector-container');

  // 3. Instancia o Canvas Visualizador
  const canvas = new TopologyCanvas(canvasEl, simulator);

  // 4. Instancia o Inspetor Matemático de Bellman-Ford
  const inspector = new MathInspector(inspectorContainer, simulator);

  // 5. Instancia a Visualização de Tabelas de Roteamento
  const tablesView = new TablesView(tablesContainer, simulator, (routerId, destId) => {
    canvas.selectedNodeId = routerId;
    inspector.inspect(routerId, destId);
    tablesView.render(routerId);
  });

  // 6. Instancia o Reprodutor de Demonstrações Guiadas (sem controls ainda)
  const guidedTour = new GuidedTourPlayer({
    simulator,
    canvas,
    tablesView,
    inspector
  });

  // 7. Instancia os Controles de Simulação (conecta o guidedTour)
  const controls = new SimulationControls({
    simulator,
    canvas,
    tablesView,
    inspector,
    guidedTour
  });

  // 8. Conecta referência cruzada: guidedTour precisa de controls
  guidedTour.setControls(controls);

  // 9. Instancia a Central de Testes Didáticos e conecta ao botão
  const testRunnerModal = new TestRunnerModal(controls);
  const btnOpenTests = document.getElementById('btn-open-tests');
  if (btnOpenTests) {
    btnOpenTests.addEventListener('click', () => {
      testRunnerModal.open();
    });
  }

  // 10. Carrega o primeiro preset agora que tudo está conectado
  controls.loadPreset(0);

  console.log('Simulador de Vetores de Distância (Bellman-Ford / RIP) inicializado com sucesso.');
});
