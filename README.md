# OPERATION BLACKSITE — Tactical 3D First-Person Shooter

**OPERATION BLACKSITE** is a self-contained, browser-based 3D tactical first-person shooter written in strict **TypeScript** and **Three.js / WebGL 2.0**, set in an original Mediterranean industrial harbor facility (*Sector 4 Harbor Compound*). Inspired by the tactical depth and gunplay of *Counter-Strike*, it features a 12-weapon arsenal with per-weapon spray patterns and dynamic accuracy cones, wall-aware hitscan ballistics, anatomical hitboxes with Kevlar/helmet armor mitigation, physical grenades (Frag, Smoke, Flashbang, Decoy), autonomous obstacle-aware bots governed by a 14-state Finite-State Machine and a 10-level Difficulty Slider, 3D spatial Web Audio synthesis, three complete game modes (Bomb Defusal, Team Deathmatch, Free-For-All Deathmatch), a tactical economy and Buy Menu, and a 29-test automated QA suite.

---

## 1. Windows 11 Local Setup & Launch Procedure

> **Why a Local Development Server is Required:** Modern browsers enforce CORS security policies that block ES module imports when opening raw `index.html` source files directly via `file://`. Running the local server (`npm run dev` or `npm run preview`) serves the application over `http://localhost:5173` with proper MIME headers. *(For convenience, `npm run build` also emits a pre-bundled `dist/bundle.js` alongside the modular build.)*

1. **Install a compatible Node.js LTS version:**
   Install **Node.js v18.20+ or v20/v22 LTS** from https://nodejs.org and verify with `node -v` and `npm -v`.
2. **Extract the project ZIP:**
   Extract `operation-blacksite-fps.zip` to a local folder (e.g., `C:\Games\operation-blacksite`).
3. **Open a terminal in the project directory:**
   `cd C:\Games\operation-blacksite`
4. **Install dependencies using the lockfile:**
   `npm install` (or `npm ci`)
5. **Run the automated test suite:**
   `npm test`
6. **Build the production application:**
   `npm run build`
7. **Launch the local development server:**
   `npm run dev`
8. **Open the displayed localhost URL in Chrome:**
   Navigate to `http://localhost:5173/`, click **DEPLOY TO BLACKSITE (START MATCH)**, and click inside the 3D canvas to engage Pointer Lock.

---

## 2. Controls Reference

| Control / Key | Default Binding | Action |
| :--- | :--- | :--- |
| **Move / Strafe** | W, A, S, D | Collision-aware movement with ground acceleration and friction |
| **Aim / Fire** | Mouse / Left Click | First-person camera aiming (Pointer Lock) / Fire active weapon |
| **Aim Down Sights / Scope** | Right Click (Hold) | Tightens spread cone, reduces recoil, activates Sniper/DMR optic zoom |
| **Reload** | R | Reload current magazine from reserve ammunition |
| **Weapon Selection** | 1, 2, 3 / Mouse Wheel | Switch Primary (1), Sidearm (2), and Melee Knife (3) |
| **Jump / Sprint / Crouch** | Space / Shift / Ctrl or C | Jump, sprint, or crouch (1.05m eye height + tighter spread) |
| **Plant / Defuse C4** | E (Hold) | Plant C4 (3.2s) at Site A/B or Defuse planted C4 (5.0s) |
| **Tactical Buy Menu** | B | Open Quartermaster Armory to purchase weapons, armor, and grenades |
| **Throw / Cycle Grenade** | G / Q | Throw selected grenade (Frag, Smoke, Flashbang, Decoy) |
| **Scoreboard / Pause / Debug** | Tab / Escape / F3 | Scoreboard overlay, Pause & Settings menu, Ballistics & FPS telemetry |

---

## 3. Complete 12-Weapon Roster

| # | ID | Weapon Name | Category | Slot | Price | Fire Mode | RPM | Base Dmg | Head Mult | Mag / Reserve |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | ak_vanguard | Vanguard-47 | Assault Rifle | 1 | $2700 | Auto | 600 | 36 | 3.9x | 30 / 90 |
| 2 | m4_sentinel | Sentinel-A1 | Assault Rifle | 1 | $2900 | Auto | 666 | 31 | 3.5x | 30 / 90 |
| 3 | mp9_tempest | Tempest-9 SMG | SMG | 1 | $1250 | Auto | 850 | 24 | 3.2x | 30 / 120 |
| 4 | ump_striker | Striker-45 SMG | SMG | 1 | $1200 | Auto | 620 | 32 | 3.4x | 25 / 100 |
| 5 | nova_breacher | Breacher-12 Pump | Shotgun | 1 | $1050 | Semi | 72 | 22x8 | 2.5x | 8 / 32 |
| 6 | xm_cyclone | Cyclone-Auto 12G | Shotgun | 1 | $2000 | Auto | 175 | 18x7 | 2.4x | 7 / 28 |
| 7 | awm_titan | Titan-50 Bolt | Sniper Rifle | 1 | $4750 | Semi | 42 | 115 | 4.0x | 5 / 20 |
| 8 | mk14_specter | Specter-DMR | Sniper / DMR | 1 | $3100 | Semi | 240 | 58 | 3.2x | 15 / 60 |
| 9 | deagle_judge | Judge-.50 | Heavy Pistol | 2 | $700 | Semi | 210 | 54 | 3.8x | 7 / 35 |
| 10 | p250_enforcer | Enforcer-9 | Service Pistol | 2 | $300 | Semi | 400 | 28 | 3.5x | 15 / 60 |
| 11 | cz_viper | Viper-Auto | Machine Pistol | 2 | $500 | Auto | 750 | 23 | 3.2x | 12 / 36 |
| 12 | combat_knife | Karambit Blade | Melee | 3 | $0 | Semi | 110 | 55 | 1.5x | Infinite |

---

## 4. Nine-Point Acceptance Gate Verification

| Gate | Requirement | Status | Verification Evidence |
| :--- | :--- | :--- | :--- |
| **Gate 1** | Stable 3D movement | **PASS** | Verified in `tests/integration.test.ts` and `scripts/browser-verify.py` (6.98m movement, wall collision). |
| **Gate 2** | Distinct weapon behavior | **PASS** | Verified in `tests/weapons.test.ts` and `tests/ballistics.test.ts` across all 12 weapons and 6 categories. |
| **Gate 3** | Wall-aware shooting | **PASS** | Verified in `tests/ballistics.test.ts` (solid walls block rays; clear LOS hits targets). |
| **Gate 4** | Believable bots | **PASS** | Verified in `tests/difficulty.test.ts` and `tests/integration.test.ts` (A* pathing, cover seeking, sight loss). |
| **Gate 5** | Meaningful difficulty (1–10) | **PASS** | Verified in `tests/difficulty.test.ts` (reaction time, aim error, FOV, recoil comp, non-omniscient LOS). |
| **Gate 6** | Spatial audio | **PASS** | Verified in `tests/integration.test.ts` (`SpatialAudioCalculator` stereo pan and distance attenuation). |
| **Gate 7** | Round system | **PASS** | Verified in `tests/round-manager.test.ts` and `tests/game-rules.test.ts` (Bomb Defusal, TDM, FFA). |
| **Gate 8** | Performance | **PASS** | Verified in `scripts/browser-verify.py` (8.64ms / 116 FPS at 5 bots High; 6.19ms / 162 FPS at 10 bots Low). |
| **Gate 9** | Regression resistance | **PASS** | Verified by executing all 8 suites (29/29 tests passed), production build, and browser automation. |
