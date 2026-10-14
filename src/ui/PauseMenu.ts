export interface PauseMenuCallbacks {
  onResume: () => void;
  onOpenSettings: () => void;
  onOpenBuyMenu: () => void;
  onRestartMatch: () => void;
  onReturnToMainMenu: () => void;
}

/**
 * Pause Menu modal triggered by Escape when a match is active.
 */
export class PauseMenuUI {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement, callbacks: PauseMenuCallbacks) {
    this.root = document.createElement('div');
    this.root.id = 'pause-menu';
    this.root.className = 'interactive-panel';
    this.root.style.cssText = `
      position:absolute;inset:0;background:rgba(7,10,16,0.85);
      display:none;align-items:center;justify-content:center;padding:24px;z-index:29;
    `;
    parent.appendChild(this.root);

    this.root.innerHTML = `
      <div style="width:100%;max-width:420px;background:rgba(13,19,28,0.96);border:1px solid rgba(86,168,245,0.4);border-top:3px solid #f59e0b;padding:26px;display:flex;flex-direction:column;gap:12px;">
        <h2 style="font-size:22px;font-weight:900;letter-spacing:0.08em;margin-bottom:6px;">MISSION PAUSED</h2>
        <button id="btn-pause-resume" class="btn-tactical btn-primary">RESUME MISSION</button>
        <button id="btn-pause-buy" class="btn-tactical">OPEN ARMORY / BUY MENU [B]</button>
        <button id="btn-pause-settings" class="btn-tactical">SETTINGS & DIFFICULTY</button>
        <button id="btn-pause-restart" class="btn-tactical">RESTART MATCH</button>
        <button id="btn-pause-mainmenu" class="btn-tactical">RETURN TO MAIN MENU</button>
      </div>
    `;

    this.root.querySelector('#btn-pause-resume')?.addEventListener('click', () => callbacks.onResume());
    this.root.querySelector('#btn-pause-buy')?.addEventListener('click', () => callbacks.onOpenBuyMenu());
    this.root.querySelector('#btn-pause-settings')?.addEventListener('click', () => callbacks.onOpenSettings());
    this.root.querySelector('#btn-pause-restart')?.addEventListener('click', () => callbacks.onRestartMatch());
    this.root.querySelector('#btn-pause-mainmenu')?.addEventListener('click', () => callbacks.onReturnToMainMenu());
  }

  setVisible(visible: boolean): void {
    this.root.style.display = visible ? 'flex' : 'none';
  }

  isVisible(): boolean {
    return this.root.style.display !== 'none';
  }
}
