export interface TelemetrySample {
  fps: number;
  frameTimeMs: number;
  activeBots: number;
  drawCalls: number;
  triangles: number;
  currentSpreadDeg: number;
  recoilPitchDeg: number;
  recoilYawDeg: number;
  playerPos: { x: number; y: number; z: number };
  roundState: string;
}

/**
 * In-game debug & telemetry overlay (toggled with F3) showing FPS,
 * frame time, recoil trajectory, spread cone, bot AI states, and collision stats.
 * Positioned cleanly below the 170x170 top-left Tactical Minimap.
 */
export class DebugOverlay {
  private container: HTMLElement | null = null;
  private enabled = false;
  private recoilTrail: Array<{ pitch: number; yaw: number }> = [];

  constructor(parent: HTMLElement | null) {
    if (parent && typeof document !== 'undefined') {
      this.container = document.createElement('div');
      this.container.id = 'debug-overlay';
      this.container.style.cssText = `
        position: absolute;
        top: 196px;
        left: 14px;
        background: rgba(8, 12, 20, 0.88);
        border: 1px solid rgba(56, 189, 248, 0.45);
        border-left: 3px solid #38bdf8;
        color: #e2e8f0;
        font-family: Consolas, monospace;
        font-size: 11px;
        padding: 10px 12px;
        line-height: 1.45;
        z-index: 25;
        display: none;
        min-width: 230px;
        pointer-events: none;
      `;
      parent.appendChild(this.container);
    }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (this.container) {
      this.container.style.display = enabled ? 'block' : 'none';
    }
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  recordRecoilSample(pitchDeg: number, yawDeg: number): void {
    this.recoilTrail.push({ pitch: pitchDeg, yaw: yawDeg });
    if (this.recoilTrail.length > 20) {
      this.recoilTrail.shift();
    }
  }

  clearRecoilTrail(): void {
    this.recoilTrail = [];
  }

  update(sample: TelemetrySample): void {
    if (!this.enabled || !this.container) return;
    this.container.innerHTML = `
      <div style="color:#38bdf8;font-weight:bold;margin-bottom:4px;">[F3] BLACKSITE TELEMETRY & BALLISTICS</div>
      <div>FPS: <b style="color:#22c55e">${sample.fps}</b> (${sample.frameTimeMs.toFixed(1)} ms)</div>
      <div>Draw Calls: ${sample.drawCalls} | Tris: ${Math.round(sample.triangles)}</div>
      <div>Active Bots: ${sample.activeBots} | Phase: ${sample.roundState}</div>
      <div>Pos: (${sample.playerPos.x.toFixed(1)}, ${sample.playerPos.y.toFixed(2)}, ${sample.playerPos.z.toFixed(1)})</div>
      <div style="margin-top:4px;color:#f59e0b;font-weight:bold;">BALLISTICS & RECOIL</div>
      <div>Dynamic Spread: ${sample.currentSpreadDeg.toFixed(2)}°</div>
      <div>Recoil Offset: P ${sample.recoilPitchDeg.toFixed(2)}° / Y ${sample.recoilYawDeg.toFixed(2)}°</div>
      <div>Spray Samples: ${this.recoilTrail.length}</div>
    `;
  }
}
