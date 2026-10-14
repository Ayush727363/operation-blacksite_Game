import { ParticipantStats } from '../game/MatchStats.ts';

export interface ResultsScreenCallbacks {
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

/**
 * End-of-match results screen displaying the winning squad/player, final score,
 * and participant scoreboard breakdown.
 */
export class ResultsScreenUI {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement, private readonly callbacks: ResultsScreenCallbacks) {
    this.root = document.createElement('div');
    this.root.id = 'results-screen';
    this.root.className = 'interactive-panel';
    this.root.style.cssText = `
      position:absolute;inset:0;background:rgba(7,10,16,0.92);
      display:none;align-items:center;justify-content:center;padding:24px;z-index:32;
    `;
    parent.appendChild(this.root);
  }

  show(
    winnerName: string,
    alphaScore: number,
    bravoScore: number,
    participants: ParticipantStats[]
  ): void {
    this.root.style.display = 'flex';
    const rows = participants
      .map(
        (p) => `
        <tr style="border-bottom:1px solid rgba(148,163,184,0.18);">
          <td style="padding:8px;font-weight:700;">${p.name}</td>
          <td style="padding:8px;">${p.team.toUpperCase()}</td>
          <td style="padding:8px;text-align:right;">${p.kills}</td>
          <td style="padding:8px;text-align:right;">${p.deaths}</td>
          <td style="padding:8px;text-align:right;">${p.headshots}</td>
          <td style="padding:8px;text-align:right;color:#22c55e;font-weight:800;">${p.score}</td>
        </tr>
      `
      )
      .join('');

    this.root.innerHTML = `
      <div style="width:100%;max-width:740px;background:rgba(13,19,28,0.98);border:1px solid rgba(86,168,245,0.45);border-top:4px solid #f59e0b;padding:28px;">
        <div style="color:#f59e0b;font-size:12px;font-weight:800;letter-spacing:0.16em;">OPERATION CONCLUDED</div>
        <h2 style="font-size:30px;font-weight:900;margin:6px 0 12px;">VICTORY: ${winnerName}</h2>
        <div style="font-family:Consolas,monospace;font-size:18px;margin-bottom:18px;">
          ALPHA SQUAD <b style="color:#f59e0b;">${alphaScore}</b> — <b style="color:#38bdf8;">${bravoScore}</b> BRAVO SQUAD
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;font-family:Consolas,monospace;margin-bottom:22px;">
          <thead>
            <tr style="border-bottom:2px solid #334155;color:#94a3b8;text-align:left;">
              <th style="padding:8px;">OPERATIVE</th>
              <th style="padding:8px;">SQUAD</th>
              <th style="padding:8px;text-align:right;">KILLS</th>
              <th style="padding:8px;text-align:right;">DEATHS</th>
              <th style="padding:8px;text-align:right;">HEADSHOTS</th>
              <th style="padding:8px;text-align:right;">SCORE</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div style="display:flex;gap:12px;">
          <button id="btn-results-rematch" class="btn-tactical btn-primary" style="flex:1;">DEPLOY REMATCH</button>
          <button id="btn-results-menu" class="btn-tactical" style="flex:1;">RETURN TO MAIN MENU</button>
        </div>
      </div>
    `;

    this.root.querySelector('#btn-results-rematch')?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onPlayAgain();
    });
    this.root.querySelector('#btn-results-menu')?.addEventListener('click', () => {
      this.hide();
      this.callbacks.onMainMenu();
    });
  }

  hide(): void {
    this.root.style.display = 'none';
  }
}
