import { GameModeType } from '../app/GameConfig.ts';
import { getBotDifficultyProfile } from '../bots/BotDifficulty.ts';

export interface MainMenuCallbacks {
  onStartMatch: (mode: GameModeType, difficulty: number, botCount: number) => void;
  onOpenSettings: () => void;
}

/**
 * Main Menu UI with Game Mode selector, 1-10 Difficulty slider & AI telemetry preview,
 * Bot Count selector, and Controls Reference modal.
 */
export class MainMenuUI {
  private readonly root: HTMLElement;
  private selectedMode: GameModeType = 'bomb_defusal';
  private selectedDifficulty = 5;
  private selectedBotCount = 7;

  constructor(
    parent: HTMLElement,
    initialMode: GameModeType,
    initialDifficulty: number,
    initialBotCount: number,
    callbacks: MainMenuCallbacks
  ) {
    this.selectedMode = initialMode;
    this.selectedDifficulty = initialDifficulty;
    this.selectedBotCount = initialBotCount;

    this.root = document.createElement('div');
    this.root.id = 'main-menu';
    this.root.className = 'interactive-panel';
    this.root.style.cssText = `
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 65% 35%, rgba(15, 23, 42, 0.72), rgba(7, 10, 16, 0.94));
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 30;
    `;
    parent.appendChild(this.root);
    this.render(callbacks);
  }

  private render(callbacks: MainMenuCallbacks): void {
    const profile = getBotDifficultyProfile(this.selectedDifficulty);
    this.root.innerHTML = `
      <div style="width:100%;max-width:960px;display:grid;grid-template-columns:1.25fr 1fr;gap:22px;background:rgba(13,19,28,0.95);border:1px solid rgba(86,168,245,0.35);border-top:3px solid #f59e0b;padding:28px;box-shadow:0 24px 60px rgba(0,0,0,0.75);">
        <div>
          <div style="color:#f59e0b;font-size:12px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;margin-bottom:6px;">
            SECTOR 4 MEDITERRANEAN NAVAL FACILITY // TACTICAL SIMULATION
          </div>
          <h1 style="font-size:34px;font-weight:900;letter-spacing:0.06em;color:#f8fafc;margin-bottom:10px;">
            OPERATION BLACKSITE
          </h1>
          <p style="color:#94a3b8;font-size:13px;line-height:1.55;margin-bottom:20px;">
            Counter-terrorist tactical first-person shooter featuring 12 distinct weapons, ballistic spray & spread physics, obstacle-aware autonomous bots, and positional 3D audio.
          </p>

          <div style="margin-bottom:16px;">
            <label style="display:block;font-size:12px;font-weight:700;color:#cbd5e1;letter-spacing:0.08em;margin-bottom:6px;">
              SELECT GAME MODE
            </label>
            <select id="menu-mode-select" style="width:100%;padding:10px 12px;background:#0f172a;color:#f8fafc;border:1px solid #334155;font-size:14px;font-weight:600;">
              <option value="bomb_defusal" ${this.selectedMode === 'bomb_defusal' ? 'selected' : ''}>Bomb Defusal (Plant / Defuse C4 at Sites A & B — Economy & Rounds)</option>
              <option value="team_deathmatch" ${this.selectedMode === 'team_deathmatch' ? 'selected' : ''}>Team Deathmatch (Alpha vs Bravo Squads — Instant Respawns)</option>
              <option value="ffa_deathmatch" ${this.selectedMode === 'ffa_deathmatch' ? 'selected' : ''}>Free-For-All Deathmatch (Every Operative For Themselves)</option>
            </select>
          </div>

          <div style="margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-size:12px;font-weight:700;color:#cbd5e1;letter-spacing:0.08em;">
                BOT AI DIFFICULTY (LEVEL 1–10)
              </label>
              <span id="menu-diff-badge" style="color:#f59e0b;font-weight:800;font-size:13px;">${profile.label}</span>
            </div>
            <input id="menu-diff-slider" type="range" min="1" max="10" step="1" value="${this.selectedDifficulty}" style="width:100%;accent-color:#f59e0b;cursor:pointer;" />
            <div id="menu-diff-desc" style="font-size:12px;color:#94a3b8;margin-top:6px;background:rgba(15,23,42,0.8);padding:8px 10px;border-left:2px solid #38bdf8;">
              ${profile.description}<br/>
              <span style="color:#38bdf8;font-family:Consolas,monospace;font-size:11px;">
                Reaction: ${(profile.reactionTimeSeconds * 1000).toFixed(0)}ms | Aim Error: ±${profile.aimErrorDegrees.toFixed(1)}° |FOV: ${profile.fovDegrees.toFixed(0)}° | Recoil Comp: ${(profile.recoilCompensationFactor * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          <div style="margin-bottom:22px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
              <label style="font-size:12px;font-weight:700;color:#cbd5e1;letter-spacing:0.08em;">
                ACTIVE BOT COUNT
              </label>
              <span id="menu-botcount-badge" style="color:#38bdf8;font-weight:800;font-size:13px;">${this.selectedBotCount} Bots</span>
            </div>
            <input id="menu-botcount-slider" type="range" min="1" max="12" step="1" value="${this.selectedBotCount}" style="width:100%;accent-color:#38bdf8;cursor:pointer;" />
          </div>

          <div style="display:flex;gap:12px;flex-wrap:wrap;">
            <button id="btn-deploy-match" class="btn-tactical btn-primary" style="flex:1;padding:13px 20px;font-size:15px;">
              DEPLOY TO BLACKSITE (START MATCH)
            </button>
            <button id="btn-open-settings" class="btn-tactical">
              SETTINGS & CONTROLS
            </button>
          </div>
        </div>

        <div style="background:rgba(15,23,42,0.85);border:1px solid rgba(148,163,184,0.2);padding:18px;display:flex;flex-direction:column;justify-content:space-between;">
          <div>
            <div style="color:#38bdf8;font-size:12px;font-weight:800;letter-spacing:0.12em;margin-bottom:10px;">
              TACTICAL CONTROLS BRIEFING
            </div>
            <div style="display:grid;grid-template-columns:1fr 1.2fr;gap:6px 10px;font-size:12px;line-height:1.45;">
              <b style="color:#f8fafc;">WASD</b><span style="color:#94a3b8;">Move / Strafe</span>
              <b style="color:#f8fafc;">Mouse / LMB</b><span style="color:#94a3b8;">Aim / Fire Weapon</span>
              <b style="color:#f8fafc;">RMB (Hold)</b><span style="color:#94a3b8;">Aim Down Sights / Scope</span>
              <b style="color:#f8fafc;">R</b><span style="color:#94a3b8;">Reload Weapon</span>
              <b style="color:#f8fafc;">1 / 2 / 3 / Wheel</b><span style="color:#94a3b8;">Primary / Sidearm / Knife</span>
              <b style="color:#f8fafc;">Shift / Space</b><span style="color:#94a3b8;">Sprint / Jump</span>
              <b style="color:#f8fafc;">Ctrl or C</b><span style="color:#94a3b8;">Crouch (Tighter Spread)</span>
              <b style="color:#f8fafc;">B</b><span style="color:#94a3b8;">Open Tactical Buy Menu</span>
              <b style="color:#f8fafc;">G / Q</b><span style="color:#94a3b8;">Throw / Cycle Grenade</span>
              <b style="color:#f8fafc;">E (Hold)</b><span style="color:#94a3b8;">Plant / Defuse C4 Bomb</span>
              <b style="color:#f8fafc;">Tab / Esc</b><span style="color:#94a3b8;">Scoreboard / Pause Menu</span>
              <b style="color:#f8fafc;">F3</b><span style="color:#94a3b8;">Ballistics & FPS Telemetry</span>
            </div>
          </div>

          <div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(148,163,184,0.18);font-size:11px;color:#94a3b8;">
            <b style="color:#f59e0b;">MAP INTEL — BLACKSITE HARBOR:</b><br/>
            • <b>Site A (West Hangar):</b> Indoor warehouse with elevated catwalk ramp & container cover.<br/>
            • <b>Site B (East Depot):</b> CQB munitions rooms connected to the Far-East Coastal Flank.<br/>
            • <b>Central Courtyard:</b> Radar pylon splitting long sniper sightlines and mid breach doors.
          </div>
        </div>
      </div>
    `;

    const modeSelect = this.root.querySelector('#menu-mode-select') as HTMLSelectElement;
    const diffSlider = this.root.querySelector('#menu-diff-slider') as HTMLInputElement;
    const diffBadge = this.root.querySelector('#menu-diff-badge') as HTMLElement;
    const diffDesc = this.root.querySelector('#menu-diff-desc') as HTMLElement;
    const botSlider = this.root.querySelector('#menu-botcount-slider') as HTMLInputElement;
    const botBadge = this.root.querySelector('#menu-botcount-badge') as HTMLElement;
    const deployBtn = this.root.querySelector('#btn-deploy-match') as HTMLButtonElement;
    const settingsBtn = this.root.querySelector('#btn-open-settings') as HTMLButtonElement;

    modeSelect?.addEventListener('change', () => {
      this.selectedMode = modeSelect.value as GameModeType;
    });

    diffSlider?.addEventListener('input', () => {
      this.selectedDifficulty = Number(diffSlider.value);
      const p = getBotDifficultyProfile(this.selectedDifficulty);
      if (diffBadge) diffBadge.textContent = p.label;
      if (diffDesc) {
        diffDesc.innerHTML = `
          ${p.description}<br/>
          <span style="color:#38bdf8;font-family:Consolas,monospace;font-size:11px;">
            Reaction: ${(p.reactionTimeSeconds * 1000).toFixed(0)}ms | Aim Error: ±${p.aimErrorDegrees.toFixed(1)}° | FOV: ${p.fovDegrees.toFixed(0)}° | Recoil Comp: ${(p.recoilCompensationFactor * 100).toFixed(0)}%
          </span>
        `;
      }
    });

    botSlider?.addEventListener('input', () => {
      this.selectedBotCount = Number(botSlider.value);
      if (botBadge) botBadge.textContent = `${this.selectedBotCount} Bots`;
    });

    deployBtn?.addEventListener('click', () => {
      callbacks.onStartMatch(this.selectedMode, this.selectedDifficulty, this.selectedBotCount);
    });

    settingsBtn?.addEventListener('click', () => {
      callbacks.onOpenSettings();
    });
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'flex' : 'none';
  }

  isVisible(): boolean {
    return this.root.style.display !== 'none';
  }

  syncValues(mode: GameModeType, difficulty: number, botCount: number): void {
    this.selectedMode = mode;
    this.selectedDifficulty = difficulty;
    this.selectedBotCount = botCount;
  }
}
