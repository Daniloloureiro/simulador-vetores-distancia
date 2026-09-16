/**
 * guided_tour.js - Reprodutor de Demonstrações Guiadas (Storyboards Didáticos)
 * Permite reproduzir simulações pré-programadas com narração explicativa,
 * avanço automático ou manual, e sincronização visual com o canvas e tabelas.
 */

export class GuidedTourPlayer {
  constructor(options) {
    this.controls = null; // Será conectado via setControls()
    this.sim = options.simulator;
    this.canvas = options.canvas;
    this.inspector = options.inspector;
    this.tablesView = options.tablesView;

    this.currentPreset = null;
    this.currentStepIndex = 0;
    this.isPlaying = false;
    this.autoTimer = null;
    this.stepDurationMs = 4500;

    this.initElements();
    this.bindEvents();
  }

  setControls(controls) {
    this.controls = controls;
  }

  initElements() {
    this.container = document.getElementById('guided-tour-panel');
    this.badgeEl = document.getElementById('tour-step-badge');
    this.titleEl = document.getElementById('tour-step-title');
    this.narrationEl = document.getElementById('tour-step-narration');
    this.progressBar = document.getElementById('tour-progress-bar');

    this.btnTourPlay = document.getElementById('btn-tour-play');
    this.btnTourNext = document.getElementById('btn-tour-next');
    this.btnTourPrev = document.getElementById('btn-tour-prev');
    this.btnTourReset = document.getElementById('btn-tour-reset');
  }

  bindEvents() {
    if (this.btnTourPlay) {
      this.btnTourPlay.addEventListener('click', () => this.togglePlay());
    }
    if (this.btnTourNext) {
      this.btnTourNext.addEventListener('click', () => this.nextStep());
    }
    if (this.btnTourPrev) {
      this.btnTourPrev.addEventListener('click', () => this.prevStep());
    }
    if (this.btnTourReset) {
      this.btnTourReset.addEventListener('click', () => this.resetTour());
    }
  }

  loadPreset(preset) {
    this.pause();
    this.currentPreset = preset;
    this.currentStepIndex = 0;

    if (!preset || !preset.storyboard || preset.storyboard.length === 0) {
      if (this.container) this.container.style.display = 'none';
      return;
    }

    if (this.container) this.container.style.display = 'block';
    this.showStep(0);
  }

  /**
   * Mostra os elementos visuais de uma etapa SEM executar a ação.
   * Usado na carga inicial para mostrar a narração da etapa 0.
   */
  showStep(stepIndex) {
    if (!this.currentPreset || !this.currentPreset.storyboard) return;
    const storyboard = this.currentPreset.storyboard;
    if (stepIndex < 0 || stepIndex >= storyboard.length) return;

    this.currentStepIndex = stepIndex;
    const step = storyboard[stepIndex];
    const total = storyboard.length;

    if (this.badgeEl) this.badgeEl.textContent = `Etapa ${stepIndex + 1} de ${total}`;
    if (this.titleEl) this.titleEl.textContent = step.stepTitle;
    if (this.narrationEl) this.narrationEl.innerHTML = `<p>${step.narration}</p>`;
    if (this.progressBar) {
      this.progressBar.style.width = `${((stepIndex + 1) / total) * 100}%`;
    }

    if (this.btnTourPrev) this.btnTourPrev.disabled = (stepIndex === 0);
    if (this.btnTourNext) this.btnTourNext.disabled = (stepIndex === total - 1);
  }

  /**
   * Executa a ação de uma etapa (step, converge, break_link, etc.)
   * e atualiza a visualização.
   */
  executeStep(stepIndex) {
    if (!this.currentPreset || !this.currentPreset.storyboard) return;
    const storyboard = this.currentPreset.storyboard;
    if (stepIndex < 0 || stepIndex >= storyboard.length) return;

    this.currentStepIndex = stepIndex;
    const step = storyboard[stepIndex];

    // Atualiza narração
    this.showStep(stepIndex);

    // Executa a ação
    this.runStepAction(step);

    // Destaque de nós
    if (step.highlightNode) {
      this.canvas.selectedNodeId = step.highlightNode;
      this.inspector.inspect(step.highlightNode, step.highlightDest || null);
    }

    // Atualiza UI
    if (this.controls) {
      this.controls.updateUI();
    }
  }

  runStepAction(step) {
    switch (step.action) {
      case 'init':
        break;

      case 'step':
        if (this.controls) {
          this.controls.triggerStep();
        } else {
          this.sim.step();
        }
        break;

      case 'step_repeat': {
        const count = step.repeatCount || 5;
        for (let i = 0; i < count && !this.sim.isConverged; i++) {
          this.sim.step();
        }
        break;
      }

      case 'converge': {
        let limit = 20;
        while (!this.sim.isConverged && limit-- > 0) {
          this.sim.step();
        }
        break;
      }

      case 'break_link':
        if (step.targetLink) {
          const link = this.sim.graph.links.get(step.targetLink);
          if (link && link.status === 'up') {
            this.sim.handleLinkToggle(step.targetLink);
          }
        }
        break;

      case 'restore_link':
        if (step.targetLink) {
          const link = this.sim.graph.links.get(step.targetLink);
          if (link && link.status === 'down') {
            this.sim.handleLinkToggle(step.targetLink);
          }
        }
        break;

      case 'inspect':
        if (step.highlightNode) {
          this.inspector.inspect(step.highlightNode, step.highlightDest);
        }
        break;
    }
  }

  nextStep() {
    if (!this.currentPreset || !this.currentPreset.storyboard) return;
    if (this.currentStepIndex < this.currentPreset.storyboard.length - 1) {
      this.executeStep(this.currentStepIndex + 1);
    } else {
      this.pause();
    }
  }

  prevStep() {
    if (!this.currentPreset || !this.currentPreset.storyboard) return;
    if (this.currentStepIndex > 0 && this.controls) {
      const targetStep = this.currentStepIndex - 1;
      this.controls.loadPreset(this.controls.currentPresetIndex, false);
      for (let i = 0; i <= targetStep; i++) {
        this.executeStep(i);
      }
    }
  }

  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    if (!this.currentPreset || !this.currentPreset.storyboard) return;
    this.isPlaying = true;
    if (this.btnTourPlay) {
      this.btnTourPlay.innerHTML = '⏸ Pausar Demonstração';
      this.btnTourPlay.classList.add('btn-warning');
    }

    const autoLoop = () => {
      if (!this.isPlaying) return;
      if (this.currentStepIndex < this.currentPreset.storyboard.length - 1) {
        this.nextStep();
        this.autoTimer = setTimeout(autoLoop, this.stepDurationMs);
      } else {
        this.pause();
      }
    };

    this.autoTimer = setTimeout(autoLoop, this.stepDurationMs);
  }

  pause() {
    this.isPlaying = false;
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
    if (this.btnTourPlay) {
      this.btnTourPlay.innerHTML = '▶ Tocar Demonstração Guiada';
      this.btnTourPlay.classList.remove('btn-warning');
    }
  }

  resetTour() {
    this.pause();
    if (this.controls) {
      this.controls.loadPreset(this.controls.currentPresetIndex);
    }
  }
}
