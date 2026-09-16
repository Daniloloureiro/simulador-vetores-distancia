/**
 * controls.js - Gerenciador de Controles da Interface e Eventos do Usuário
 * Vincula botões de reprodução (Play, Pause, Step, Reset), velocidade,
 * troca de presets didáticos, toggles de mitigação e log de eventos.
 */

import { PRESETS } from '../data/presets.js';
import { NetworkGraph } from '../engine/graph.js';

export class SimulationControls {
  constructor(options) {
    this.sim = options.simulator;
    this.canvas = options.canvas;
    this.tablesView = options.tablesView;
    this.inspector = options.inspector;
    this.guidedTour = options.guidedTour || null;

    this.isPlaying = false;
    this.timerId = null;
    this.playSpeedMs = 1500;
    this.currentPresetIndex = 0;

    this.initElements();
    this.bindEvents();
    // NÃO chama loadPreset aqui — será chamado pelo app.js depois de tudo conectado
  }

  initElements() {
    this.btnPlay = document.getElementById('btn-play');
    this.btnStep = document.getElementById('btn-step');
    this.btnReset = document.getElementById('btn-reset');
    this.speedSelect = document.getElementById('speed-select');
    this.modeSelect = document.getElementById('mode-select');
    this.presetSelect = document.getElementById('preset-select');
    this.infinitySelect = document.getElementById('infinity-select');

    this.presetDesc = document.getElementById('preset-description');
    this.presetActionBtn = document.getElementById('btn-preset-action');

    this.roundBadge = document.getElementById('status-round');
    this.convergedBadge = document.getElementById('status-converged');
    this.logConsole = document.getElementById('event-log-content');
    this.btnClearLog = document.getElementById('btn-clear-log');

    this.btnAddNode = document.getElementById('btn-add-node');
    this.btnAddLink = document.getElementById('btn-add-link');

    // Popula o select de presets
    if (this.presetSelect) {
      this.presetSelect.innerHTML = PRESETS.map((p, idx) =>
        `<option value="${idx}">${p.title}</option>`
      ).join('');
    }
  }

  bindEvents() {
    if (this.btnPlay) this.btnPlay.addEventListener('click', () => this.togglePlay());
    if (this.btnStep) this.btnStep.addEventListener('click', () => this.triggerStep());
    if (this.btnReset) this.btnReset.addEventListener('click', () => this.resetSimulation());

    if (this.speedSelect) {
      this.speedSelect.addEventListener('change', (e) => {
        this.playSpeedMs = Number(e.target.value);
        if (this.isPlaying) {
          this.pause();
          this.play();
        }
      });
    }

    if (this.modeSelect) {
      this.modeSelect.addEventListener('change', (e) => {
        this.sim.setMode(e.target.value);
        this.updateUI();
      });
    }

    if (this.presetSelect) {
      this.presetSelect.addEventListener('change', (e) => {
        this.loadPreset(Number(e.target.value));
      });
    }

    if (this.infinitySelect) {
      this.infinitySelect.addEventListener('change', (e) => {
        this.sim.setInfinity(Number(e.target.value));
        this.updateUI();
      });
    }

    if (this.btnClearLog) {
      this.btnClearLog.addEventListener('click', () => {
        if (this.logConsole) {
          this.logConsole.innerHTML = '<div class="log-empty">Console de eventos limpo.</div>';
        }
      });
    }

    if (this.presetActionBtn) {
      this.presetActionBtn.addEventListener('click', () => {
        const preset = PRESETS[this.currentPresetIndex];
        if (preset && preset.demonstrationAction) {
          const target = preset.demonstrationAction.targetLink;
          this.sim.handleLinkToggle(target);
          this.canvas.animManager.clear();
          this.updateUI();
        }
      });
    }

    if (this.btnAddNode) {
      this.btnAddNode.addEventListener('click', () => this.promptAddNode());
    }
    if (this.btnAddLink) {
      this.btnAddLink.addEventListener('click', () => this.promptAddLink());
    }

    // Interações no Canvas
    this.canvas.onNodeSelected = (nodeId) => {
      this.tablesView.render(nodeId);
      if (nodeId) {
        this.inspector.inspect(nodeId);
      }
    };

    this.canvas.onLinkToggled = (linkId) => {
      this.sim.handleLinkToggle(linkId);
      this.updateUI();
    };

    this.canvas.onLinkEditWeight = (linkId) => {
      this.promptEditLinkWeight(linkId);
    };

    // Callback de logs do simulador
    this.sim.onLog = (entry) => this.appendLog(entry);
    this.sim.onStateChange = () => this.updateUI();
  }

  loadPreset(index, updateTour = true) {
    this.pause();
    this.currentPresetIndex = index;
    const preset = PRESETS[index];
    if (!preset) return;

    if (this.presetSelect) this.presetSelect.value = index;
    if (this.presetDesc) this.presetDesc.innerHTML = `<p>${preset.description}</p>`;

    // Configura o botão de ação do preset
    if (this.presetActionBtn) {
      if (preset.demonstrationAction) {
        this.presetActionBtn.style.display = 'inline-flex';
        this.presetActionBtn.textContent = preset.demonstrationAction.label;
      } else {
        this.presetActionBtn.style.display = 'none';
      }
    }

    // Ajusta modo e infinito recomendados pelo cenário
    if (this.modeSelect) this.modeSelect.value = preset.mode;
    this.sim.setMode(preset.mode);

    if (this.infinitySelect) this.infinitySelect.value = preset.infinity || 16;
    this.sim.setInfinity(preset.infinity || 16);

    // Constrói o grafo a partir dos dados do preset
    const g = new NetworkGraph();
    for (const n of preset.nodes) {
      g.addNode(n.id, n.label, n.x, n.y);
    }
    for (const l of preset.links) {
      g.addLink(l.source, l.target, l.weight);
    }

    this.canvas.animManager.clear();
    this.sim.initFromGraph(g);

    // Seleciona o primeiro nó para o inspetor
    const firstNode = preset.nodes[0] ? preset.nodes[0].id : null;
    this.canvas.selectedNodeId = firstNode;
    if (firstNode) {
      this.inspector.inspect(firstNode);
    }

    this.updateUI();

    if (updateTour && this.guidedTour) {
      this.guidedTour.loadPreset(preset);
    }
  }

  resetSimulation() {
    this.loadPreset(this.currentPresetIndex);
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (this.sim.isConverged) {
      return;
    }

    this.isPlaying = true;
    if (this.btnPlay) {
      this.btnPlay.innerHTML = '⏸ Pausar';
      this.btnPlay.classList.add('btn-warning');
    }

    const stepInterval = () => {
      if (!this.isPlaying) return;
      const result = this.sim.step();

      if (result.packets.length > 0) {
        this.canvas.animManager.spawnPackets(
          result.packets,
          (id) => this.canvas.getNodePos(id),
          Math.min(1000, this.playSpeedMs * 0.75)
        );
      }

      this.updateUI();

      if (result.converged) {
        this.pause();
        return;
      }

      this.timerId = setTimeout(stepInterval, this.playSpeedMs);
    };

    stepInterval();
  }

  pause() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    if (this.btnPlay) {
      this.btnPlay.innerHTML = '▶ Executar (Play)';
      this.btnPlay.classList.remove('btn-warning');
    }
  }

  triggerStep() {
    this.pause();
    const result = this.sim.step();

    if (result.packets.length > 0) {
      this.canvas.animManager.spawnPackets(
        result.packets,
        (id) => this.canvas.getNodePos(id),
        Math.min(1000, this.playSpeedMs * 0.75)
      );
    }

    this.updateUI();
  }

  updateUI() {
    if (this.roundBadge) this.roundBadge.textContent = `Iteração: ${this.sim.iteration}`;
    if (this.convergedBadge) {
      if (this.sim.isConverged) {
        this.convergedBadge.textContent = 'Estado: CONVERGIDO';
        this.convergedBadge.className = 'badge badge-success';
      } else {
        this.convergedBadge.textContent = 'Estado: CONVERGINDO...';
        this.convergedBadge.className = 'badge badge-warning';
      }
    }

    this.tablesView.render(this.canvas.selectedNodeId);

    if (this.canvas.selectedNodeId) {
      this.inspector.render();
    }
  }

  appendLog(entry) {
    if (!this.logConsole) return;
    const p = document.createElement('div');
    p.className = `log-line log-${entry.type.toLowerCase()}`;
    p.innerHTML = `
      <span class="log-time">[${entry.timestamp}]</span>
      <span class="log-tag log-tag-${entry.type.toLowerCase()}">${entry.type}</span>
      <span class="log-msg">${entry.message}</span>
    `;
    this.logConsole.appendChild(p);
    this.logConsole.scrollTop = this.logConsole.scrollHeight;
  }

  promptAddNode() {
    const existing = this.sim.graph.getNodeIds();
    const nextChar = String.fromCharCode(65 + existing.length);
    const id = prompt(`Identificador do novo roteador:`, nextChar);
    if (!id || id.trim() === '') return;

    const trimmed = id.trim().toUpperCase();
    if (existing.includes(trimmed)) {
      alert(`O roteador ${trimmed} já existe.`);
      return;
    }

    const x = 100 + Math.random() * (this.canvas.width - 200);
    const y = 100 + Math.random() * (this.canvas.height - 200);

    this.sim.graph.addNode(trimmed, `Roteador ${trimmed}`, x, y);
    this.canvas.animManager.clear();
    this.sim.syncDirectLinks();
    this.sim.initFromGraph(this.sim.graph);
    this.updateUI();
  }

  promptAddLink() {
    const nodes = this.sim.graph.getNodeIds();
    if (nodes.length < 2) {
      alert('São necessários pelo menos 2 roteadores para criar um enlace.');
      return;
    }

    const u = prompt(`Roteador de origem (${nodes.join(', ')}):`, nodes[0]);
    if (!u || !nodes.includes(u.toUpperCase())) return;

    const v = prompt(`Roteador de destino (${nodes.join(', ')}):`, nodes[1]);
    if (!v || !nodes.includes(v.toUpperCase()) || u.toUpperCase() === v.toUpperCase()) return;

    const costStr = prompt('Custo da rota / peso do enlace (inteiro >= 1):', '1');
    const cost = Math.max(1, parseInt(costStr, 10) || 1);

    this.sim.graph.addLink(u.toUpperCase(), v.toUpperCase(), cost);
    this.canvas.animManager.clear();
    this.sim.syncDirectLinks();
    this.sim.initFromGraph(this.sim.graph);
    this.updateUI();
  }

  promptEditLinkWeight(linkId) {
    const link = this.sim.graph.links.get(linkId);
    if (!link) return;

    const costStr = prompt(`Novo custo para o enlace ${link.source} <-> ${link.target} (atual: ${link.weight}):`, link.weight);
    if (costStr === null) return;

    const newWeight = parseInt(costStr, 10);
    if (!isNaN(newWeight) && newWeight >= 1) {
      this.sim.handleLinkWeightChange(linkId, newWeight);
      this.updateUI();
    }
  }
}
