import { WEAPON_LIST } from '../weapons/WeaponDefinitions.ts';
import { GRENADE_DEFINITIONS, GrenadeType } from '../weapons/Grenades.ts';
import { ARMOR_PRICES } from '../game/Economy.ts';

export interface BuyMenuCallbacks {
  onBuyWeapon: (weaponId: string) => { success: boolean; message: string };
  onBuyGrenade: (type: GrenadeType) => { success: boolean; message: string };
  onBuyArmor: (withHelmet: boolean) => { success: boolean; message: string };
  onClose: () => void;
}

/**
 * Interactive Tactical Buy Menu ([B]) allowing weapon, armor, and grenade purchases
 * with real-time funds display and feedback.
 */
export class BuyMenuUI {
  private readonly root: HTMLElement;
  private statusMessage = '';

  constructor(parent: HTMLElement, private readonly callbacks: BuyMenuCallbacks) {
    this.root = document.createElement('div');
    this.root.id = 'buy-menu';
    this.root.className = 'interactive-panel';
    this.root.style.cssText = `
      position:absolute;inset:0;background:rgba(8,12,20,0.88);
      display:none;align-items:center;justify-content:center;padding:24px;z-index:28;
    `;
    parent.appendChild(this.root);
  }

  open(money: number, equippedWeaponIds: string[], buyAllowed: boolean): void {
    this.statusMessage = buyAllowed ? 'Select tactical equipment to purchase.' : 'Buy phase has expired for this round.';
    this.root.style.display = 'flex';
    this.render(money, equippedWeaponIds, buyAllowed);
  }

  close(): void {
    this.root.style.display = 'none';
  }

  isOpen(): boolean {
    return this.root.style.display !== 'none';
  }

  render(money: number, equippedWeaponIds: string[], buyAllowed: boolean): void {
    const buyableWeapons = WEAPON_LIST.filter((w) => w.price > 0);
    const grenades = Object.values(GRENADE_DEFINITIONS);

    this.root.innerHTML = `
      <div style="width:100%;max-width:920px;background:rgba(13,19,28,0.96);border:1px solid rgba(86,168,245,0.4);border-top:3px solid #22c55e;padding:24px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
          <div>
            <h2 style="font-size:22px;font-weight:900;color:#f8fafc;letter-spacing:0.06em;">TACTICAL ARMORY & QUARTERMASTER</h2>
            <div style="font-size:12px;color:#94a3b8;">${this.statusMessage}</div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <div style="font-size:22px;font-weight:900;color:#22c55e;font-family:Consolas,monospace;">CREDITS: $${money}</div>
            <button id="btn-close-buy" class="btn-tactical">CLOSE [B / ESC]</button>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;margin-bottom:16px;">
          ${buyableWeapons
            .map((w) => {
              const owned = equippedWeaponIds.includes(w.id);
              const canAfford = money >= w.price && buyAllowed && !owned;
              return `
                <button class="btn-tactical buy-weapon-btn" data-weapon="${w.id}" ${!canAfford ? 'disabled' : ''} style="text-align:left;padding:10px 12px;">
                  <div style="display:flex;justify-content:space-between;font-size:13px;font-weight:800;">
                    <span>${w.name}</span>
                    <span style="color:${owned ? '#38bdf8' : '#22c55e'};">${owned ? 'EQUIPPED' : `$${w.price}`}</span>
                  </div>
                  <div style="font-size:11px;color:#94a3b8;margin-top:4px;text-transform:none;">
                    ${w.category.toUpperCase()} • DMG ${w.baseDamage}${w.pellets > 1 ? `x${w.pellets}` : ''} • ${w.rpm} RPM
                  </div>
                </button>
              `;
            })
            .join('')}
        </div>

        <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;">
          <button id="buy-kevlar" class="btn-tactical" ${money < ARMOR_PRICES.kevlar || !buyAllowed ? 'disabled' : ''}>
            Kevlar Vest ($${ARMOR_PRICES.kevlar})
          </button>
          <button id="buy-helmet" class="btn-tactical" ${money < ARMOR_PRICES.kevlarAndHelmet || !buyAllowed ? 'disabled' : ''}>
            Kevlar + Helmet ($${ARMOR_PRICES.kevlarAndHelmet})
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">
            ${grenades
              .map(
                (g) => `
              <button class="btn-tactical buy-grenade-btn" data-grenade="${g.type}" ${money < g.price || !buyAllowed ? 'disabled' : ''} style="padding:8px;font-size:11px;">
                ${g.type.toUpperCase()} ($${g.price})
              </button>
            `
              )
              .join('')}
          </div>
        </div>
      </div>
    `;

    this.root.querySelector('#btn-close-buy')?.addEventListener('click', () => {
      this.callbacks.onClose();
    });

    this.root.querySelectorAll('.buy-weapon-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const weaponId = (btn as HTMLElement).dataset.weapon!;
        const res = this.callbacks.onBuyWeapon(weaponId);
        this.statusMessage = res.message;
      });
    });

    this.root.querySelector('#buy-kevlar')?.addEventListener('click', () => {
      const res = this.callbacks.onBuyArmor(false);
      this.statusMessage = res.message;
    });

    this.root.querySelector('#buy-helmet')?.addEventListener('click', () => {
      const res = this.callbacks.onBuyArmor(true);
      this.statusMessage = res.message;
    });

    this.root.querySelectorAll('.buy-grenade-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const gType = (btn as HTMLElement).dataset.grenade as GrenadeType;
        const res = this.callbacks.onBuyGrenade(gType);
        this.statusMessage = res.message;
      });
    });
  }
}
