import * as THREE from 'three';
import { KillFeedItem } from '../combat/CombatEvents.ts';
import { BOMB_SITES } from '../world/LevelData.ts';
import { GrenadeType } from '../weapons/Grenades.ts';

export interface HudRenderState {
  visible: boolean;
  health: number;
  armor: number;
  hasHelmet: boolean;
  money: number;
  weaponName: string;
  weaponCategory: string;
  fireMode: string;
  magazineAmmo: number;
  reserveAmmo: number;
  isReloading: boolean;
  reloadProgress: number;
  activeSlot: number;
  selectedGrenade: GrenadeType;
  grenadeCounts: Record<GrenadeType, number>;
  spreadDeg: number;
  isAds: boolean;
  isScopedSniper: boolean;
  alphaScore: number;
  bravoScore: number;
  roundNumber: number;
  roundPhase: string;
  phaseTimerSec: number;
  gameMode: string;
  playerKills: number;
  playerDeaths: number;
  bombPlanted: boolean;
  bombSite: 'A' | 'B' | null;
  bombFuseRemaining: number;
  interactionPrompt: string | null;
  interactionProgress: number; // 0 to 1
  announcementBanner: string | null;
  hitMarker: { active: boolean; headshot: boolean; fatal: boolean; alpha: number };
  damageFlashAlpha: number;
  flashbangAlpha: number;
  killFeed: ReadonlyArray<KillFeedItem>;
  playerPos: THREE.Vector3;
  playerYaw: number;
  teammatePositions: Array<{ x: number; z: number; alive: boolean }>;
  spottedEnemies: Array<{ x: number; z: number }>;
}

/**
 * Renders the in-game Tactical HUD:
 * - Dynamic spread crosshair & Sniper Optic Reticle
 * - Hit Marker & Headshot Indicator
 * - Damage Vignette & Flashbang Impairment Overlay
 * - 2D Tactical Minimap Canvas (Courtyard, Sites A & B, teammates, planted bomb)
 * - Round Timer, Team Scores, Kill/Death Counters, and Kill Feed
 * - Health, Armor, Money, Weapon Ammo, and Grenade Counters
 */
export class HudUI {
  private readonly root: HTMLElement;
  private readonly damageOverlay: HTMLElement;
  private readonly flashOverlay: HTMLElement;
  private readonly scopeOverlay: HTMLElement;
  private readonly crosshairContainer: HTMLElement;
  private readonly hitMarkerEl: HTMLElement;
  private readonly topScoreBar: HTMLElement;
  private readonly killFeedEl: HTMLElement;
  private readonly bottomStatusEl: HTMLElement;
  private readonly bottomWeaponEl: HTMLElement;
  private readonly promptEl: HTMLElement;
  private readonly bannerEl: HTMLElement;
  private readonly minimapCanvas: HTMLCanvasElement;
  private readonly minimapCtx: CanvasRenderingContext2D | null;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'hud-root';
    this.root.style.cssText = 'position:absolute;inset:0;pointer-events:none;display:none;z-index:12;';
    parent.appendChild(this.root);

    // Incoming Damage Vignette
    this.damageOverlay = document.createElement('div');
    this.damageOverlay.style.cssText = `
      position:absolute;inset:0;
      background:radial-gradient(circle, transparent 45%, rgba(220, 38, 38, 0.75) 100%);
      opacity:0;transition:opacity 0.06s linear;
    `;
    this.root.appendChild(this.damageOverlay);

    // Flashbang Whiteout Overlay
    this.flashOverlay = document.createElement('div');
    this.flashOverlay.style.cssText = `
      position:absolute;inset:0;background:#ffffff;opacity:0;
    `;
    this.root.appendChild(this.flashOverlay);

    // Sniper Scope Reticle Overlay
    this.scopeOverlay = document.createElement('div');
    this.scopeOverlay.style.cssText = `
      position:absolute;inset:0;display:none;
      background:radial-gradient(circle, transparent 28%, rgba(4, 7, 12, 0.96) 31%);
    `;
    this.scopeOverlay.innerHTML = `
      <div style="position:absolute;top:50%;left:0;right:0;height:1px;background:rgba(56,189,248,0.7);"></div>
      <div style="position:absolute;left:50%;top:0;bottom:0;width:1px;background:rgba(56,189,248,0.7);"></div>
      <div style="position:absolute;top:50%;left:50%;width:8px;height:8px;margin:-4px 0 0 -4px;border-radius:50%;background:#ef4444;"></div>
    `;
    this.root.appendChild(this.scopeOverlay);

    // Dynamic Crosshair
    this.crosshairContainer = document.createElement('div');
    this.crosshairContainer.style.cssText = 'position:absolute;top:50%;left:50%;width:0;height:0;';
    this.root.appendChild(this.crosshairContainer);

    // Hit Marker
    this.hitMarkerEl = document.createElement('div');
    this.hitMarkerEl.style.cssText = `
      position:absolute;top:50%;left:50%;width:22px;height:22px;margin:-11px 0 0 -11px;
      opacity:0;pointer-events:none;
    `;
    this.root.appendChild(this.hitMarkerEl);

    // Top Match Score & Timer Bar
    this.topScoreBar = document.createElement('div');
    this.topScoreBar.style.cssText = `
      position:absolute;top:14px;left:50%;transform:translateX(-50%);
      display:flex;align-items:center;gap:14px;
      background:rgba(10, 15, 24, 0.88);border:1px solid rgba(86, 168, 245, 0.35);
      padding:8px 18px;font-family:Consolas,monospace;
    `;
    this.root.appendChild(this.topScoreBar);

    // Top-Left Tactical Minimap
    const mapWrap = document.createElement('div');
    mapWrap.style.cssText = `
      position:absolute;top:14px;left:14px;width:170px;height:170px;
      background:rgba(10, 15, 24, 0.88);border:1px solid rgba(86, 168, 245, 0.4);
      padding:4px;
    `;
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.width = 160;
    this.minimapCanvas.height = 160;
    mapWrap.appendChild(this.minimapCanvas);
    this.root.appendChild(mapWrap);
    this.minimapCtx = typeof this.minimapCanvas.getContext === 'function'
      ? this.minimapCanvas.getContext('2d')
      : null;

    // Top-Right Kill Feed
    this.killFeedEl = document.createElement('div');
    this.killFeedEl.style.cssText = `
      position:absolute;top:14px;right:16px;display:flex;flex-direction:column;gap:5px;
      align-items:flex-end;font-size:12px;font-weight:600;
    `;
    this.root.appendChild(this.killFeedEl);

    // Center Interaction / Bomb Progress Prompt
    this.promptEl = document.createElement('div');
    this.promptEl.style.cssText = `
      position:absolute;bottom:145px;left:50%;transform:translateX(-50%);
      background:rgba(10, 15, 24, 0.9);border:1px solid #f59e0b;
      padding:8px 16px;color:#f8fafc;font-size:13px;font-weight:700;display:none;
      text-align:center;min-width:240px;
    `;
    this.root.appendChild(this.promptEl);

    // Center Phase / Round Announcement Banner
    this.bannerEl = document.createElement('div');
    this.bannerEl.style.cssText = `
      position:absolute;top:105px;left:50%;transform:translateX(-50%);
      background:rgba(15, 23, 42, 0.9);border-top:2px solid #f59e0b;border-bottom:2px solid #f59e0b;
      padding:8px 24px;color:#f8fafc;font-size:16px;font-weight:800;letter-spacing:0.1em;
      display:none;text-align:center;
    `;
    this.root.appendChild(this.bannerEl);

    // Bottom-Left Health, Armor & Economy
    this.bottomStatusEl = document.createElement('div');
    this.bottomStatusEl.style.cssText = `
      position:absolute;bottom:18px;left:18px;
      display:flex;align-items:center;gap:16px;
      background:rgba(10, 15, 24, 0.88);border:1px solid rgba(86, 168, 245, 0.35);
      border-left:4px solid #22c55e;padding:12px 18px;
    `;
    this.root.appendChild(this.bottomStatusEl);

    // Bottom-Right Weapon, Ammo & Equipment
    this.bottomWeaponEl = document.createElement('div');
    this.bottomWeaponEl.style.cssText = `
      position:absolute;bottom:18px;right:18px;
      background:rgba(10, 15, 24, 0.88);border:1px solid rgba(86, 168, 245, 0.35);
      border-right:4px solid #f59e0b;padding:12px 18px;min-width:260px;text-align:right;
    `;
    this.root.appendChild(this.bottomWeaponEl);
  }

  update(state: HudRenderState): void {
    this.root.style.display = state.visible ? 'block' : 'none';
    if (!state.visible) return;

    this.damageOverlay.style.opacity = state.damageFlashAlpha.toFixed(2);
    this.flashOverlay.style.opacity = state.flashbangAlpha.toFixed(2);
    this.scopeOverlay.style.display = state.isScopedSniper ? 'block' : 'none';

    // Dynamic Crosshair gap from spreadDeg
    const gapPx = Math.max(4, Math.min(48, Math.round(state.spreadDeg * 5.5)));
    this.crosshairContainer.style.display = state.isScopedSniper ? 'none' : 'block';
    this.crosshairContainer.innerHTML = `
      <div style="position:absolute;left:-1px;top:${-gapPx - 8}px;width:2px;height:8px;background:#22c55e;box-shadow:0 0 2px #000;"></div>
      <div style="position:absolute;left:-1px;top:${gapPx}px;width:2px;height:8px;background:#22c55e;box-shadow:0 0 2px #000;"></div>
      <div style="position:absolute;top:-1px;left:${-gapPx - 8}px;width:8px;height:2px;background:#22c55e;box-shadow:0 0 2px #000;"></div>
      <div style="position:absolute;top:-1px;left:${gapPx}px;width:8px;height:2px;background:#22c55e;box-shadow:0 0 2px #000;"></div>
    `;

    // Hit Marker
    if (state.hitMarker.active) {
      const col = state.hitMarker.headshot ? '#ef4444' : '#f8fafc';
      this.hitMarkerEl.style.opacity = state.hitMarker.alpha.toFixed(2);
      this.hitMarkerEl.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 22 22">
          <line x1="2" y1="2" x2="8" y2="8" stroke="${col}" stroke-width="2.2" />
          <line x1="20" y1="2" x2="14" y2="8" stroke="${col}" stroke-width="2.2" />
          <line x1="2" y1="20" x2="8" y2="14" stroke="${col}" stroke-width="2.2" />
          <line x1="20" y1="20" x2="14" y2="14" stroke="${col}" stroke-width="2.2" />
        </svg>
        ${state.hitMarker.headshot ? '<div style="color:#ef4444;font-size:10px;font-weight:900;text-align:center;margin-top:2px;">HEADSHOT</div>' : ''}
      `;
    } else {
      this.hitMarkerEl.style.opacity = '0';
    }

    // Format timer MM:SS
    const totalSec = Math.max(0, Math.ceil(state.phaseTimerSec));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    const timerColor = state.bombPlanted ? '#ef4444' : '#f8fafc';

    this.topScoreBar.innerHTML = `
      <div style="color:#f59e0b;font-weight:900;font-size:16px;">ALPHA ${state.alphaScore}</div>
      <div style="text-align:center;padding:0 12px;border-left:1px solid #334155;border-right:1px solid #334155;">
        <div style="font-size:20px;font-weight:900;color:${timerColor};">${timeStr}</div>
        <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;">
          R${state.roundNumber} • ${state.roundPhase.replace('_', ' ')}
          ${state.bombPlanted ? ` • <b style="color:#ef4444;">C4 SITE ${state.bombSite} (${ state.bombFuseRemaining.toFixed(1) }s)</b>` : ''}
        </div>
      </div>
      <div style="color:#38bdf8;font-weight:900;font-size:16px;">${state.bravoScore} BRAVO</div>
      <div style="font-size:12px;color:#cbd5e1;margin-left:6px;">
        K: <b>${state.playerKills}</b> / D: <b>${state.playerDeaths}</b>
      </div>
    `;

    // Kill Feed
    this.killFeedEl.innerHTML = state.killFeed
      .map((item) => {
        const kCol = item.killerTeam === 'alpha' ? '#f59e0b' : '#38bdf8';
        const vCol = item.victimTeam === 'alpha' ? '#f59e0b' : '#38bdf8';
        return `
          <div style="background:rgba(10,15,24,0.85);border-right:3px solid ${kCol};padding:4px 10px;">
            <span style="color:${kCol}">${item.killerName}</span>
            <span style="color:#94a3b8;margin:0 6px;">[${item.weaponName}${item.headshot ? ' • HS' : ''}]</span>
            <span style="color:${vCol}">${item.victimName}</span>
          </div>
        `;
      })
      .join('');

    // Center Interaction Prompt
    if (state.interactionPrompt) {
      this.promptEl.style.display = 'block';
      const pct = Math.round(state.interactionProgress * 100);
      this.promptEl.innerHTML = `
        <div>${state.interactionPrompt}</div>
        ${
          state.interactionProgress > 0
            ? `<div style="width:100%;height:6px;background:#1e293b;margin-top:6px;"><div style="width:${pct}%;height:100%;background:#f59e0b;"></div></div>`
            : ''
        }
      `;
    } else {
      this.promptEl.style.display = 'none';
    }

    if (state.announcementBanner) {
      this.bannerEl.style.display = 'block';
      this.bannerEl.textContent = state.announcementBanner;
    } else {
      this.bannerEl.style.display = 'none';
    }

    // Bottom-Left Health, Armor & Money
    const hpColor = state.health > 50 ? '#22c55e' : state.health > 25 ? '#f59e0b' : '#ef4444';
    this.bottomStatusEl.style.borderLeftColor = hpColor;
    this.bottomStatusEl.innerHTML = `
      <div>
        <div style="font-size:10px;color:#94a3b8;font-weight:700;">HEALTH</div>
        <div style="font-size:26px;font-weight:900;color:${hpColor};font-family:Consolas,monospace;">+${state.health}</div>
      </div>
      <div style="border-left:1px solid #334155;padding-left:14px;">
        <div style="font-size:10px;color:#94a3b8;font-weight:700;">ARMOR ${state.hasHelmet ? '(HELMET)' : ''}</div>
        <div style="font-size:24px;font-weight:900;color:#38bdf8;font-family:Consolas,monospace;">${state.armor}</div>
      </div>
      <div style="border-left:1px solid #334155;padding-left:14px;">
        <div style="font-size:10px;color:#94a3b8;font-weight:700;">CREDITS [B: BUY]</div>
        <div style="font-size:22px;font-weight:900;color:#22c55e;font-family:Consolas,monospace;">$${state.money}</div>
      </div>
    `;

    // Bottom-Right Weapon & Grenades
    const ammoText =
      state.weaponCategory === 'melee'
        ? 'MELEE'
        : `${state.magazineAmmo} <span style="font-size:16px;color:#94a3b8;">/ ${state.reserveAmmo}</span>`;

    this.bottomWeaponEl.innerHTML = `
      <div style="font-size:14px;font-weight:800;color:#f8fafc;letter-spacing:0.06em;">
        ${state.weaponName} <span style="font-size:11px;color:#f59e0b;">[${state.fireMode.toUpperCase()}]</span>
      </div>
      <div style="font-size:26px;font-weight:900;color:#f8fafc;font-family:Consolas,monospace;margin:2px 0;">
        ${state.isReloading ? `<span style="color:#f59e0b;font-size:16px;">RELOADING (${Math.round(state.reloadProgress * 100)}%)</span>` : ammoText}
      </div>
      <div style="font-size:11px;color:#94a3b8;">
        Slots: <b style="color:${state.activeSlot === 1 ? '#f59e0b' : '#64748b'}">[1]PRI</b>
        <b style="color:${state.activeSlot === 2 ? '#f59e0b' : '#64748b'}">[2]SEC</b>
        <b style="color:${state.activeSlot === 3 ? '#f59e0b' : '#64748b'}">[3]KNIFE</b>
        | [G] ${state.selectedGrenade.toUpperCase()} (${state.grenadeCounts[state.selectedGrenade] || 0})
      </div>
    `;

    this.drawMinimap(state);
  }

  private drawMinimap(state: HudRenderState): void {
    const ctx = this.minimapCtx;
    if (!ctx) return;

    const w = 160;
    const h = 160;
    ctx.clearRect(0, 0, w, h);

    // Map coordinates [-56..+56] -> [0..160]
    const toMap = (wx: number, wz: number) => ({
      x: ((wx + 56) / 112) * w,
      y: ((wz + 56) / 112) * h
    });

    // Background & key architectural sectors
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    // West Hangar, Courtyard, East Depot outlines
    ctx.strokeRect(12, 38, 42, 68);
    ctx.strokeRect(54, 48, 52, 64);
    ctx.strokeRect(106, 38, 40, 68);

    // Bomb Site A & B markers
    for (const site of [BOMB_SITES.A, BOMB_SITES.B]) {
      const p = toMap(site.center.x, site.center.z);
      ctx.fillStyle = site.id === 'A' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(site.id, p.x - 3, p.y + 3);
    }

    // Teammates (blue/amber dots)
    for (const tm of state.teammatePositions) {
      if (!tm.alive) continue;
      const p = toMap(tm.x, tm.z);
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spotted enemies (red dots only when currently in LOS)
    for (const en of state.spottedEnemies) {
      const p = toMap(en.x, en.z);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player icon & view direction line
    const pp = toMap(state.playerPos.x, state.playerPos.z);
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(pp.x, pp.y, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pp.x, pp.y);
    ctx.lineTo(pp.x - Math.sin(state.playerYaw) * 12, pp.y - Math.cos(state.playerYaw) * 12);
    ctx.stroke();
  }
}
