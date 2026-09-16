/**
 * canvas.js - Renderizador Visual da Topologia e Pacotes em Canvas HTML5
 * Suporta alta resolução (Retina/HiDPI), arrastar nós, clique em enlaces para corte/edição
 * e animação contínua a 60 FPS.
 */

import { AnimationManager } from './animations.js';

export class TopologyCanvas {
  constructor(canvasElement, simulator) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.sim = simulator;
    this.animManager = new AnimationManager();

    this.selectedNodeId = null;
    this.hoveredNodeId = null;
    this.hoveredLinkId = null;

    this.draggedNodeId = null;
    this.dragOffset = { x: 0, y: 0 };

    this.linkCreationSource = null; // Para ferramenta de criar enlace
    this.toolMode = 'pointer'; // 'pointer' | 'toggle_link' | 'add_link'

    this.nodeRadius = 26;
    this.pixelRatio = window.devicePixelRatio || 1;

    // Callbacks de interação
    this.onNodeSelected = null;
    this.onLinkToggled = null;
    this.onLinkEditWeight = null;

    this._needsResize = true;
    this.initEvents();
    this.resize();
    this.startRenderLoop();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const rect = parent ? parent.getBoundingClientRect() : this.canvas.getBoundingClientRect();
    this.pixelRatio = window.devicePixelRatio || 1;
    const newWidth = Math.max(280, rect.width || 800);
    const newHeight = Math.max(280, rect.height || 500);

    const prevWidth = this.width || newWidth;
    const prevHeight = this.height || newHeight;

    this.width = newWidth;
    this.height = newHeight;

    this.canvas.width = Math.round(this.width * this.pixelRatio);
    this.canvas.height = Math.round(this.height * this.pixelRatio);

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(this.pixelRatio, this.pixelRatio);

    // Ajusta posições dos nós para não saírem da tela ao redimensionar
    if (this.sim && this.sim.graph) {
      const pad = this.nodeRadius + 12;
      for (const node of this.sim.graph.nodes.values()) {
        if (prevWidth > 0 && prevHeight > 0 && (newWidth < prevWidth || newHeight < prevHeight)) {
          node.x = Math.max(pad, Math.min(this.width - pad, node.x * (newWidth / prevWidth)));
          node.y = Math.max(pad, Math.min(this.height - pad, node.y * (newHeight / prevHeight)));
        } else {
          node.x = Math.max(pad, Math.min(this.width - pad, node.x));
          node.y = Math.max(pad, Math.min(this.height - pad, node.y));
        }
      }
    }
  }

  initEvents() {
    // ResizeObserver moderno para resposta imediata
    if (window.ResizeObserver && this.canvas.parentElement) {
      const ro = new ResizeObserver(() => this.resize());
      ro.observe(this.canvas.parentElement);
    } else {
      window.addEventListener('resize', () => this.resize());
    }

    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleMouseUp(e));

    // Suporte a Touch em tablets e celulares
    this.canvas.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      const mouseEvent = new MouseEvent('mouseup', {});
      window.dispatchEvent(mouseEvent);
    });
  }

  getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  findNodeAt(x, y) {
    for (const [id, node] of this.sim.graph.nodes.entries()) {
      const dx = x - node.x;
      const dy = y - node.y;
      if (Math.hypot(dx, dy) <= this.nodeRadius + 4) {
        return id;
      }
    }
    return null;
  }

  findLinkAt(x, y) {
    for (const [linkId, link] of this.sim.graph.links.entries()) {
      const u = this.sim.graph.nodes.get(link.source);
      const v = this.sim.graph.nodes.get(link.target);
      if (!u || !v) continue;

      // Ponto médio (onde fica o selo de custo)
      const midX = (u.x + v.x) / 2;
      const midY = (u.y + v.y) / 2;
      if (Math.hypot(x - midX, y - midY) <= 18) {
        return linkId;
      }

      // Distância do ponto ao segmento de reta
      const dist = this.distToSegment({ x, y }, u, v);
      if (dist <= 10) {
        return linkId;
      }
    }
    return null;
  }

  distToSegment(p, v, w) {
    const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
    if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
    t = Math.max(0, Math.min(1, t));
    const projX = v.x + t * (w.x - v.x);
    const projY = v.y + t * (w.y - v.y);
    return Math.hypot(p.x - projX, p.y - projY);
  }

  handleMouseDown(e) {
    const pos = this.getMousePos(e);
    const clickedNodeId = this.findNodeAt(pos.x, pos.y);
    const clickedLinkId = this.findLinkAt(pos.x, pos.y);

    if (this.toolMode === 'toggle_link' && clickedLinkId) {
      if (this.onLinkToggled) this.onLinkToggled(clickedLinkId);
      return;
    }

    if (clickedNodeId) {
      this.selectedNodeId = clickedNodeId;
      this.draggedNodeId = clickedNodeId;
      const node = this.sim.graph.nodes.get(clickedNodeId);
      this.dragOffset = { x: pos.x - node.x, y: pos.y - node.y };

      if (this.onNodeSelected) {
        this.onNodeSelected(clickedNodeId);
      }
      return;
    }

    if (clickedLinkId) {
      // Clique com botão direito ou clique simples no link
      if (e.button === 2 || e.shiftKey) {
        if (this.onLinkEditWeight) this.onLinkEditWeight(clickedLinkId);
      } else {
        if (this.onLinkToggled) this.onLinkToggled(clickedLinkId);
      }
      return;
    }

    // Clique no vazio
    this.selectedNodeId = null;
    if (this.onNodeSelected) {
      this.onNodeSelected(null);
    }
  }

  handleMouseMove(e) {
    const pos = this.getMousePos(e);

    if (this.draggedNodeId) {
      const node = this.sim.graph.nodes.get(this.draggedNodeId);
      if (node) {
        node.x = Math.max(this.nodeRadius, Math.min(this.width - this.nodeRadius, pos.x - this.dragOffset.x));
        node.y = Math.max(this.nodeRadius, Math.min(this.height - this.nodeRadius, pos.y - this.dragOffset.y));
      }
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    this.hoveredNodeId = this.findNodeAt(pos.x, pos.y);
    this.hoveredLinkId = this.hoveredNodeId ? null : this.findLinkAt(pos.x, pos.y);

    if (this.hoveredNodeId) {
      this.canvas.style.cursor = 'grab';
    } else if (this.hoveredLinkId) {
      this.canvas.style.cursor = 'pointer';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  handleMouseUp() {
    this.draggedNodeId = null;
    if (this.hoveredNodeId) {
      this.canvas.style.cursor = 'grab';
    } else {
      this.canvas.style.cursor = 'default';
    }
  }

  getNodePos(nodeId) {
    const node = this.sim.graph.nodes.get(nodeId);
    return node ? { x: node.x, y: node.y } : null;
  }

  startRenderLoop() {
    const render = (time) => {
      if (this._needsResize) {
        this.resize();
        this._needsResize = false;
      }
      this.animManager.update(time, (id) => this.getNodePos(id));
      this.draw();
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackgroundGrid();
    this.drawLinks();
    this.drawAnimatedPackets();
    this.drawParticles();
    this.drawNodes();
  }

  drawBackgroundGrid() {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 1;

    const gridSize = 30;
    ctx.beginPath();
    for (let x = 0; x < this.width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
    }
    for (let y = 0; y < this.height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawLinks() {
    const ctx = this.ctx;

    for (const [linkId, link] of this.sim.graph.links.entries()) {
      const u = this.sim.graph.nodes.get(link.source);
      const v = this.sim.graph.nodes.get(link.target);
      if (!u || !v) continue;

      const isHovered = (this.hoveredLinkId === linkId);
      const isDown = (link.status === 'down');

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(u.x, u.y);
      ctx.lineTo(v.x, v.y);

      if (isDown) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = isHovered ? 4 : 2.5;
        ctx.setLineDash([8, 6]);
      } else {
        ctx.strokeStyle = isHovered ? '#60a5fa' : 'rgba(56, 189, 248, 0.55)';
        ctx.lineWidth = isHovered ? 4 : 2.5;
        ctx.setLineDash([]);
      }
      ctx.stroke();
      ctx.restore();

      // Selo do Custo / Peso no ponto médio
      const midX = (u.x + v.x) / 2;
      const midY = (u.y + v.y) / 2;

      ctx.save();
      ctx.beginPath();
      ctx.arc(midX, midY, 13, 0, Math.PI * 2);
      ctx.fillStyle = isDown ? '#450a0a' : (isHovered ? '#1e293b' : '#0f172a');
      ctx.strokeStyle = isDown ? '#ef4444' : (isHovered ? '#60a5fa' : '#38bdf8');
      ctx.lineWidth = 1.8;
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 11px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isDown ? '#fca5a5' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (isDown) {
        ctx.fillText('✕', midX, midY);
      } else {
        ctx.fillText(`${link.weight}`, midX, midY);
      }

      // Dica ao passar o mouse
      if (isHovered) {
        ctx.font = '10px sans-serif';
        ctx.fillStyle = isDown ? '#ef4444' : '#94a3b8';
        ctx.fillText(isDown ? 'Falha (clique p/ restaurar)' : 'Clique p/ cortar cabo', midX, midY - 18);
      }

      ctx.restore();
    }
  }

  drawNodes() {
    const ctx = this.ctx;

    for (const [id, node] of this.sim.graph.nodes.entries()) {
      const isSelected = (this.selectedNodeId === id);
      const isHovered = (this.hoveredNodeId === id);
      const routerState = this.sim.routers.get(id);

      ctx.save();

      // Halo de seleção
      if (isSelected || isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, this.nodeRadius + 6, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(255, 255, 255, 0.12)';
        ctx.fill();
      }

      // Círculo principal do Roteador
      const grad = ctx.createRadialGradient(
        node.x - 5, node.y - 5, 2,
        node.x, node.y, this.nodeRadius
      );
      grad.addColorStop(0, '#1e293b');
      grad.addColorStop(1, '#0f172a');

      ctx.beginPath();
      ctx.arc(node.x, node.y, this.nodeRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#38bdf8' : (isHovered ? '#94a3b8' : '#334155');
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Rótulo principal do Nó (A, B, C...)
      ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = isSelected ? '#38bdf8' : '#f8fafc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(id, node.x, node.y - 1);

      // Subtítulo do Roteador abaixo
      ctx.font = '500 11px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(node.label || `Roteador ${id}`, node.x, node.y + this.nodeRadius + 14);

      ctx.restore();
    }
  }

  drawAnimatedPackets() {
    const ctx = this.ctx;

    for (const pkt of this.animManager.packets) {
      const u = this.getNodePos(pkt.from);
      const v = this.getNodePos(pkt.to);
      if (!u || !v) continue;

      // Posição interpolada
      const curX = u.x + (v.x - u.x) * pkt.progress;
      const curY = u.y + (v.y - u.y) * pkt.progress;

      ctx.save();

      // Brilho do pacote
      ctx.shadowColor = pkt.color || '#38bdf8';
      ctx.shadowBlur = 10;

      // Círculo do pacote
      ctx.beginPath();
      ctx.arc(curX, curY, 7, 0, Math.PI * 2);
      ctx.fillStyle = pkt.color || '#38bdf8';
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Selo com resumo do vetor em trânsito
      ctx.shadowBlur = 0;
      const vectorEntries = Object.entries(pkt.vector || {});
      if (vectorEntries.length > 0) {
        const text = vectorEntries.map(([d, c]) => `${d}:${c >= this.sim.infinity ? '∞' : c}`).join(',');
        ctx.font = 'bold 10px monospace';
        const metrics = ctx.measureText(text);
        const padX = 5;
        const boxW = metrics.width + padX * 2;
        const boxH = 16;
        const boxX = curX - boxW / 2;
        const boxY = curY - 20;

        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(boxX, boxY, boxW, boxH, 4);
        } else {
          ctx.rect(boxX, boxY, boxW, boxH);
        }
        ctx.fill();
        ctx.strokeStyle = pkt.color || '#38bdf8';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = '#f1f5f9';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, curX, boxY + boxH / 2);
      }

      ctx.restore();
    }
  }

  drawParticles() {
    const ctx = this.ctx;
    for (const p of this.animManager.particles) {
      ctx.save();
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
