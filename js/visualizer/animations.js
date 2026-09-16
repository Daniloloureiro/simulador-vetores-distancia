/**
 * animations.js - Gerenciador de Animações de Pacotes e Efeitos Visuais
 * Fornece interpolação suave para pacotes transitando pelos enlaces
 * e partículas de impacto quando pacotes chegam aos roteadores.
 */

export class AnimationManager {
  constructor() {
    this.packets = []; // { id, from, to, sourcePos, targetPos, progress, speed, vector, color }
    this.particles = []; // { x, y, vx, vy, life, maxLife, color, size }
  }

  /**
   * Adiciona um lote de pacotes gerados em um passo para animação
   */
  spawnPackets(packetDataList, getPositionFn, durationMs = 1200) {
    const now = performance.now();
    for (const p of packetDataList) {
      const pSource = getPositionFn(p.from);
      const pTarget = getPositionFn(p.to);
      if (!pSource || !pTarget) continue;

      this.packets.push({
        id: p.id,
        from: p.from,
        to: p.to,
        linkId: p.linkId,
        vector: p.vector,
        startTime: now,
        duration: durationMs,
        progress: 0.0,
        color: this.getNodeColor(p.from)
      });
    }
  }

  /**
   * Atualiza o estado da animação no loop de renderização (delta time)
   */
  update(currentTime, getPositionFn, onPacketArrive = null) {
    // Atualiza pacotes
    for (let i = this.packets.length - 1; i >= 0; i--) {
      const pkt = this.packets[i];
      const elapsed = currentTime - pkt.startTime;
      pkt.progress = Math.min(1.0, elapsed / pkt.duration);

      // Chegou ao destino
      if (pkt.progress >= 1.0) {
        const targetPos = getPositionFn(pkt.to);
        if (targetPos) {
          this.spawnImpactParticles(targetPos.x, targetPos.y, pkt.color);
        }
        if (onPacketArrive) {
          onPacketArrive(pkt);
        }
        this.packets.splice(i, 1);
      }
    }

    // Atualiza partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const part = this.particles[i];
      part.x += part.vx;
      part.y += part.vy;
      part.life--;
      if (part.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnImpactParticles(x, y, color) {
    const count = 8;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5);
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        color: color || '#38bdf8',
        size: 2 + Math.random() * 2
      });
    }
  }

  getNodeColor(nodeId) {
    const palette = ['#38bdf8', '#818cf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb923c'];
    let hash = 0;
    for (let i = 0; i < nodeId.length; i++) {
      hash = nodeId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % palette.length;
    return palette[idx];
  }

  clear() {
    this.packets = [];
    this.particles = [];
  }
}
