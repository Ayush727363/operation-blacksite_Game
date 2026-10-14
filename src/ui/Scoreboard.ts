import { ParticipantStats } from '../game/MatchStats.ts';

/**
 * Tab-activated tactical scoreboard displaying team scores, participant K/D/HS/Objective
 * metrics, and round outcome history.
 */
export class ScoreboardUI {
  private readonly root: HTMLElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.id = 'scoreboard-overlay';
    this.root.style.cssText = `
      position:absolute;inset:0;background:rgba(7,10,16,0.78);
      display:none;align-items:center;justify-content:center;padding:24px;z-index:24;
      pointer-events:none;
    `;
    parent.appendChild(this.root);
  }

  setVisible(
    visible: boolean,
    participants: ParticipantStats[],
    alphaScore: number,
    bravoScore: number,
    mode: string
  ): void {
    this.root.style.display = visible ? 'flex' : 'none';
    if (!visible) return;

    const rowsHtml = participants
      .map((p) => {
        const teamColor = p.team === 'alpha' ? '#f59e0b' : p.team === 'bravo' ? '#38bdf8' : '#e11d48';
        return `
          <tr style="border-bottom:1px solid rgba(148,163,184,0.15);color:${p.alive ? '#f8fafc' : '#64748b'};">
            <td style="padding:8px;color:${teamColor};font-weight:700;">${p.team.toUpperCase()}</td>
            <td style="padding:8px;font-weight:700;">${p.name} ${p.alive ? '' : '(KIA)'}</td>
            <td style="padding:8px;text-align:right;">${p.kills}</td>
            <td style="padding:8px;text-align:right;">${p.deaths}</td>
            <td style="padding:8px;text-align:right;">${p.headshots}</td>
            <td style="padding:8px;text-align:right;">${p.plants + p.defuses}</td>
            <td style="padding:8px;text-align:right;font-weight:800;color:#22c55e;">${p.score}</td>
          </tr>
        `;
      })
      .join('');

    this.root.innerHTML = `
      <div style="width:100%;max-width:760px;background:rgba(13,19,28,0.95);border:1px solid rgba(86,168,245,0.4);padding:22px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div style="font-size:18px;font-weight:900;letter-spacing:0.08em;">
            OPERATION BLACKSITE — SCOREBOARD (${mode.toUpperCase().replace('_', ' ')})
          </div>
          <div style="font-family:Consolas,monospace;font-size:16px;font-weight:800;">
            <span style="color:#f59e0b;">ALPHA ${alphaScore}</span> : <span style="color:#38bdf8;">${bravoScore} BRAVO</span>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px;font-family:Consolas,monospace;">
          <thead>
            <tr style="border-bottom:2px solid #334155;color:#94a3b8;text-align:left;">
              <th style="padding:8px;">TEAM</th>
              <th style="padding:8px;">OPERATIVE</th>
              <th style="padding:8px;text-align:right;">KILLS</th>
              <th style="padding:8px;text-align:right;">DEATHS</th>
              <th style="padding:8px;text-align:right;">HS</th>
              <th style="padding:8px;text-align:right;">OBJ</th>
              <th style="padding:8px;text-align:right;">SCORE</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;
  }
}
