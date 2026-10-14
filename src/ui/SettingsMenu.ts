import { SettingsStore } from '../settings/SettingsStore.ts';
import { GraphicsPreset } from '../settings/GraphicsSettings.ts';
import { getBotDifficultyProfile } from '../bots/BotDifficulty.ts';
import { KeyBindingMap } from '../settings/KeyBindings.ts';

/**
 * Comprehensive Settings & Accessibility menu controlling Mouse Sensitivity, FOV,
 * Audio Volumes, Mute, Bot Difficulty (1-10), Graphics Quality Presets, and Key Rebinding.
 */
export class SettingsMenuUI {
  private readonly root: HTMLElement;
  private rebindingAction: keyof KeyBindingMap | null = null;
  private readonly onKeyCaptureBound: (e: KeyboardEvent) => void;

  constructor(
    parent: HTMLElement,
    private readonly store: SettingsStore,
    private readonly onClose: () => void
  ) {
    this.root = document.createElement('div');
    this.root.id = 'settings-menu';
    this.root.className = 'interactive-panel';
    this.root.style.cssText = `
      position:absolute;inset:0;background:rgba(7,10,16,0.92);
      display:none;align-items:center;justify-content:center;padding:24px;z-index:35;
    `;
    parent.appendChild(this.root);

    this.onKeyCaptureBound = this.handleKeyCapture.bind(this);
  }

  open(): void {
    this.root.style.display = 'flex';
    this.render();
  }

  close(): void {
    this.rebindingAction = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.onKeyCaptureBound, true);
    }
    this.root.style.display = 'none';
    this.onClose();
  }

  isOpen(): boolean {
    return this.root.style.display !== 'none';
  }

  private handleKeyCapture(e: KeyboardEvent): void {
    if (!this.rebindingAction) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code !== 'Escape') {
      const current = this.store.get().keyBindings;
      this.store.update({
        keyBindings: {
          ...current,
          [this.rebindingAction]: e.code
        }
      });
    }
    this.rebindingAction = null;
    window.removeEventListener('keydown', this.onKeyCaptureBound, true);
    this.render();
  }

  private render(): void {
    const s = this.store.get();
    const diffProfile = getBotDifficultyProfile(s.difficulty);

    const keyRows: Array<{ key: keyof KeyBindingMap; label: string }> = [
      { key: 'moveForward', label: 'Move Forward' },
      { key: 'moveBackward', label: 'Move Backward' },
      { key: 'moveLeft', label: 'Strafe Left' },
      { key: 'moveRight', label: 'Strafe Right' },
      { key: 'jump', label: 'Jump' },
      { key: 'sprint', label: 'Sprint' },
      { key: 'crouch', label: 'Crouch' },
      { key: 'reload', label: 'Reload Weapon' },
      { key: 'interact', label: 'Plant / Defuse C4' },
      { key: 'buyMenu', label: 'Buy Menu' },
      { key: 'throwGrenade', label: 'Throw Grenade' }
    ];

    this.root.innerHTML = `
      <div style="width:100%;max-width:860px;max-height:90vh;overflow-y:auto;background:rgba(13,19,28,0.98);border:1px solid rgba(86,168,245,0.45);border-top:3px solid #38bdf8;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">
          <h2 style="font-size:22px;font-weight:900;letter-spacing:0.06em;">TACTICAL CONFIGURATION & SETTINGS</h2>
          <div style="display:flex;gap:10px;">
            <button id="btn-settings-reset" class="btn-tactical">RESET DEFAULTS</button>
            <button id="btn-settings-close" class="btn-tactical btn-primary">SAVE & CLOSE</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;">
          <div>
            <h3 style="color:#f59e0b;font-size:13px;letter-spacing:0.1em;margin-bottom:10px;">MOUSE, CAMERA & AI DIFFICULTY</h3>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px;color:#cbd5e1;display:flex;justify-content:space-between;">
                <span>Horizontal Sensitivity</span><b>${s.mouseSensitivityX.toFixed(2)}</b>
              </label>
              <input id="set-sens-x" type="range" min="0.1" max="4.0" step="0.05" value="${s.mouseSensitivityX}" style="width:100%;accent-color:#38bdf8;" />
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px;color:#cbd5e1;display:flex;justify-content:space-between;">
                <span>Vertical Sensitivity</span><b>${s.mouseSensitivityY.toFixed(2)}</b>
              </label>
              <input id="set-sens-y" type="range" min="0.1" max="4.0" step="0.05" value="${s.mouseSensitivityY}" style="width:100%;accent-color:#38bdf8;" />
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px;color:#cbd5e1;display:flex;justify-content:space-between;">
                <span>Field of View (FOV)</span><b>${s.fov}°</b>
              </label>
              <input id="set-fov" type="range" min="60" max="110" step="1" value="${s.fov}" style="width:100%;accent-color:#38bdf8;" />
            </div>

            <div style="margin-bottom:14px;">
              <label style="font-size:12px;color:#cbd5e1;display:flex;justify-content:space-between;">
                <span>Bot Difficulty (1–10)</span><b style="color:#f59e0b;">${diffProfile.label}</b>
              </label>
              <input id="set-difficulty" type="range" min="1" max="10" step="1" value="${s.difficulty}" style="width:100%;accent-color:#f59e0b;" />
              <div style="font-size:11px;color:#94a3b8;margin-top:4px;">
                ${diffProfile.description} (Reaction ${(diffProfile.reactionTimeSeconds * 1000).toFixed(0)}ms, Error ±${diffProfile.aimErrorDegrees.toFixed(1)}°)
              </div>
            </div>

            <h3 style="color:#f59e0b;font-size:13px;letter-spacing:0.1em;margin:14px 0 10px;">AUDIO & GRAPHICS QUALITY</h3>

            <div style="margin-bottom:10px;">
              <label style="font-size:12px;color:#cbd5e1;display:flex;justify-content:space-between;">
                <span>Master Volume</span><b>${Math.round(s.masterVolume * 100)}%</b>
              </label>
              <input id="set-vol-master" type="range" min="0" max="1" step="0.05" value="${s.masterVolume}" style="width:100%;accent-color:#22c55e;" />
            </div>

            <div style="margin-bottom:10px;">
              <label style="font-size:12px;color:#cbd5e1;display:flex;justify-content:space-between;">
                <span>Effects Volume</span><b>${Math.round(s.sfxVolume * 100)}%</b>
              </label>
              <input id="set-vol-sfx" type="range" min="0" max="1" step="0.05" value="${s.sfxVolume}" style="width:100%;accent-color:#22c55e;" />
            </div>

            <div style="margin-bottom:12px;">
              <label style="font-size:12px;color:#cbd5e1;display:flex;align-items:center;gap:8px;cursor:pointer;">
                <input id="set-mute" type="checkbox" ${s.muted ? 'checked' : ''} /> Mute All Audio
              </label>
            </div>

            <div style="margin-bottom:10px;">
              <label style="font-size:12px;color:#cbd5e1;display:block;margin-bottom:4px;">Graphics Quality Preset</label>
              <select id="set-gfx-preset" style="width:100%;padding:8px;background:#0f172a;color:#f8fafc;border:1px solid #334155;">
                <option value="low" ${s.graphics.preset === 'low' ? 'selected' : ''}>Low (0.75x Scale, Shadows Off)</option>
                <option value="medium" ${s.graphics.preset === 'medium' ? 'selected' : ''}>Medium (0.9x Scale, Basic Particles)</option>
                <option value="high" ${s.graphics.preset === 'high' ? 'selected' : ''}>High (1.0x Scale, Full Effects)</option>
                <option value="ultra" ${s.graphics.preset === 'ultra' ? 'selected' : ''}>Ultra (Native HiDPI, Full Effects)</option>
              </select>
            </div>
          </div>

          <div>
            <h3 style="color:#38bdf8;font-size:13px;letter-spacing:0.1em;margin-bottom:10px;">KEY BINDINGS (CLICK TO REBIND)</h3>
            <div style="display:flex;flex-direction:column;gap:6px;">
              ${keyRows
                .map(
                  (row) => `
                <div style="display:flex;justify-content:space-between;align-items:center;background:rgba(15,23,42,0.8);padding:6px 10px;border:1px solid rgba(148,163,184,0.15);">
                  <span style="font-size:12px;color:#cbd5e1;">${row.label}</span>
                  <button class="btn-tactical rebind-btn" data-action="${row.key}" style="padding:4px 10px;font-size:11px;">
                    ${this.rebindingAction === row.key ? 'PRESS ANY KEY...' : s.keyBindings[row.key]}
                  </button>
                </div>
              `
                )
                .join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#btn-settings-close')?.addEventListener('click', () => this.close());
    this.root.querySelector('#btn-settings-reset')?.addEventListener('click', () => {
      this.store.reset();
      this.render();
    });

    this.root.querySelector('#set-sens-x')?.addEventListener('change', (e) => {
      this.store.update({ mouseSensitivityX: Number((e.target as HTMLInputElement).value) });
      this.render();
    });
    this.root.querySelector('#set-sens-y')?.addEventListener('change', (e) => {
      this.store.update({ mouseSensitivityY: Number((e.target as HTMLInputElement).value) });
      this.render();
    });
    this.root.querySelector('#set-fov')?.addEventListener('change', (e) => {
      this.store.update({ fov: Number((e.target as HTMLInputElement).value) });
      this.render();
    });
    this.root.querySelector('#set-difficulty')?.addEventListener('change', (e) => {
      this.store.update({ difficulty: Number((e.target as HTMLInputElement).value) });
      this.render();
    });
    this.root.querySelector('#set-vol-master')?.addEventListener('change', (e) => {
      this.store.update({ masterVolume: Number((e.target as HTMLInputElement).value) });
      this.render();
    });
    this.root.querySelector('#set-vol-sfx')?.addEventListener('change', (e) => {
      this.store.update({ sfxVolume: Number((e.target as HTMLInputElement).value) });
      this.render();
    });
    this.root.querySelector('#set-mute')?.addEventListener('change', (e) => {
      this.store.update({ muted: (e.target as HTMLInputElement).checked });
      this.render();
    });
    this.root.querySelector('#set-gfx-preset')?.addEventListener('change', (e) => {
      this.store.applyGraphicsPreset((e.target as HTMLSelectElement).value as GraphicsPreset);
      this.render();
    });

    this.root.querySelectorAll('.rebind-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.rebindingAction = (btn as HTMLElement).dataset.action as keyof KeyBindingMap;
        this.render();
        window.addEventListener('keydown', this.onKeyCaptureBound, true);
      });
    });
  }
}
