import time
import json
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DIST_INDEX = PROJECT_ROOT / "dist" / "index.html"
DIST_BUNDLE = PROJECT_ROOT / "dist" / "bundle.js"
INTERMEDIATE_DIR = PROJECT_ROOT / "dist" / "screenshots"
INTERMEDIATE_DIR.mkdir(parents=True, exist_ok=True)

def run_browser_verification():
    if not DIST_INDEX.exists() or not DIST_BUNDLE.exists():
        print("Error: dist/index.html or dist/bundle.js not found. Run 'npm run build' first.")
        sys.exit(1)

    html_content = DIST_INDEX.read_text(encoding="utf-8")
    bundle_js = DIST_BUNDLE.read_text(encoding="utf-8")

    # Inline the compiled bundle into HTML for sandboxed Chromium execution
    full_html = html_content.replace('<script src="./bundle.js"></script>', '')

    print("[BrowserVerify] Launching Headless Chromium WebGL2...")
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--use-gl=angle")
    opts.add_argument("--use-angle=swiftshader")
    opts.add_argument("--enable-webgl")
    opts.add_argument("--ignore-gpu-blocklist")
    opts.add_argument("--window-size=1280,720")
    opts.set_capability("goog:loggingPrefs", {"browser": "ALL"})

    driver = webdriver.Chrome(options=opts)
    try:
        driver.get("about:blank")
        driver.execute_script(
            """
            document.open();
            document.write(arguments[0]);
            document.close();
            """,
            full_html
        )
        driver.execute_script(bundle_js)
        time.sleep(0.5)

        logs = driver.get_log("browser")
        for l in logs:
            if l.get("level") == "SEVERE":
                print("  [Browser Console Error]:", l)

        # 1. Verify Main Menu & Canvas creation
        canvas = driver.find_element(By.ID, "game-canvas")
        main_menu = driver.find_element(By.ID, "main-menu")
        assert canvas.is_displayed(), "Game canvas not visible"
        assert main_menu.is_displayed(), "Main menu not visible on startup"
        driver.save_screenshot(str(INTERMEDIATE_DIR / "preview_1_main_menu.png"))
        print("  ✓ Application startup, WebGL2 canvas, and Main Menu verified")

        # 2. Configure match on Main Menu and click Deploy
        driver.execute_script("""
          const diffSlider = document.getElementById('menu-diff-slider');
          diffSlider.value = '7';
          diffSlider.dispatchEvent(new Event('input'));
          const botSlider = document.getElementById('menu-botcount-slider');
          botSlider.value = '7';
          botSlider.dispatchEvent(new Event('input'));
        """)
        deploy_btn = driver.find_element(By.ID, "btn-deploy-match")
        deploy_btn.click()
        time.sleep(0.3)

        # 3. Verify active gameplay, HUD, movement, firing, weapon switching, grenades, and buy menu
        gameplay_check = driver.execute_script("""
          const g = window.__BLACKSITE_GAME__;
          if (!g) return { ok: false, error: 'Game instance missing' };

          // Advance past warmup into buy phase
          g.step(3.2);
          const buyAllowedInBuyPhase = g.roundManager.isBuyAllowed();

          // Open Buy Menu and purchase Judge-.50 pistol
          g.openBuyMenu();
          const buyRes = g.purchaseWeapon('deagle_judge');
          g.buyMenuUI.close();

          // Advance into active round phase
          g.step(12.5);
          const phase = g.roundManager.getPhase();

          // Switch back to primary slot 1 (Sentinel-A1)
          g.player.weapons.switchSlot(1);
          const startPos = g.player.movement.position.clone();

          // Simulate player moving forward and strafing right toward Central Courtyard
          g.input.simulateKeyDown('KeyW');
          for (let i = 0; i < 35; i++) {
            g.step(0.05);
          }
          g.input.simulateKeyUp('KeyW');
          const movedDist = g.player.movement.position.distanceTo(startPos);

          // Fire weapon 3 times
          const magBefore = g.player.weapons.getCurrentWeapon().magazineAmmo;
          g.firePlayerWeapon();
          g.step(0.15);
          g.firePlayerWeapon();
          g.step(0.15);
          g.firePlayerWeapon();
          const magAfter = g.player.weapons.getCurrentWeapon().magazineAmmo;

          // Throw frag grenade
          const grenBefore = g.player.grenades.getCount('frag');
          g.throwPlayerGrenade();
          const grenAfter = g.player.grenades.getCount('frag');

          // Reload weapon
          g.player.weapons.getCurrentWeapon().startReload();
          const reloading = g.player.weapons.getCurrentWeapon().reloader.isReloading();
          g.step(2.6);
          const magAfterReload = g.player.weapons.getCurrentWeapon().magazineAmmo;

          // Enable F3 debug telemetry overlay for visual inspection
          g.debugOverlay.setEnabled(true);
          g.firePlayerWeapon();
          g.step(0.02);

          return {
            ok: true,
            buyAllowedInBuyPhase,
            buySuccess: buyRes.success,
            phase,
            movedDist,
            magBefore,
            magAfter,
            grenBefore,
            grenAfter,
            reloading,
            magAfterReload,
            botCount: g.botManager.getBots().length,
            drawCalls: g.sceneManager.renderer.info.render.calls,
            triangles: g.sceneManager.renderer.info.render.triangles
          };
        """)
        print("  ✓ Gameplay verification result:", json.dumps(gameplay_check))
        assert gameplay_check["ok"], "Gameplay check failed"
        assert gameplay_check["buySuccess"], "Buy menu weapon purchase failed"
        assert gameplay_check["movedDist"] > 2.5, "Player movement failed"
        assert gameplay_check["magAfter"] == gameplay_check["magBefore"] - 3, "Weapon ammo depletion failed"
        assert gameplay_check["grenAfter"] == gameplay_check["grenBefore"] - 1, "Grenade throw failed"
        assert gameplay_check["magAfterReload"] == 30, "Weapon reload failed"

        driver.save_screenshot(str(INTERMEDIATE_DIR / "preview_2_active_gameplay.png"))

        # 4. Open Buy Menu and capture screenshot
        driver.execute_script("window.__BLACKSITE_GAME__.openBuyMenu();")
        time.sleep(0.2)
        driver.save_screenshot(str(INTERMEDIATE_DIR / "preview_3_buy_menu.png"))
        driver.execute_script("window.__BLACKSITE_GAME__.buyMenuUI.close();")

        # 5. Test Pause, Resume, Difficulty Change, Round Completion, and Match Restart
        lifecycle_check = driver.execute_script("""
          const g = window.__BLACKSITE_GAME__;
          g.pauseMatch();
          const pausedState = g.isPaused();
          g.resumeMatch();
          const resumedState = !g.isPaused();

          g.settingsStore.update({ difficulty: 10 });
          const newDiff = g.botManager.getDifficultyProfile().level;

          g.roundManager.endRound('alpha', 'Defenders Eliminated');
          const scoreAlpha = g.roundManager.getAlphaScore();

          g.startMatch('team_deathmatch', 6, 8);
          const restartedMode = g.config.mode;
          const restartedBots = g.botManager.getBots().length;

          return {
            pausedState,
            resumedState,
            newDiff,
            scoreAlpha,
            restartedMode,
            restartedBots
          };
        """)
        print("  ✓ Lifecycle & pause/restart verification:", json.dumps(lifecycle_check))
        assert lifecycle_check["pausedState"] and lifecycle_check["resumedState"]
        assert lifecycle_check["newDiff"] == 10
        assert lifecycle_check["scoreAlpha"] == 1
        assert lifecycle_check["restartedMode"] == "team_deathmatch"
        assert lifecycle_check["restartedBots"] == 8

        # 6. Performance Benchmark across Bot Counts (5 vs 10 bots) & Graphics Settings (High vs Low)
        perf_results = driver.execute_script("""
          const g = window.__BLACKSITE_GAME__;
          function benchmarkScenario(botCount, preset, frames) {
            g.settingsStore.applyGraphicsPreset(preset);
            g.startMatch('team_deathmatch', 6, botCount);
            g.step(4.0); // Enter active combat
            const t0 = performance.now();
            for (let i = 0; i < frames; i++) {
              g.step(1 / 60);
            }
            const totalMs = performance.now() - t0;
            const avgFrameMs = totalMs / frames;
            return {
              botCount,
              preset,
              frames,
              avgStepMs: Number(avgFrameMs.toFixed(2)),
              equivalentFps: Math.round(1000 / Math.max(0.1, avgFrameMs)),
              drawCalls: g.sceneManager.renderer.info.render.calls,
              triangles: Math.round(g.sceneManager.renderer.info.render.triangles)
            };
          }
          return [
            benchmarkScenario(5, 'high', 20),
            benchmarkScenario(10, 'high', 20),
            benchmarkScenario(10, 'low', 20)
          ];
        """)
        print("  ✓ Performance Benchmark Results (Headless Chromium SwiftShader):")
        for r in perf_results:
            print("    ", json.dumps(r))

        # 7. Check browser console logs for any errors
        logs = driver.get_log("browser")
        severe_errors = [l for l in logs if l.get("level") == "SEVERE"]
        if severe_errors:
            print("  ! Browser console errors:", severe_errors)
            sys.exit(1)
        print("  ✓ Zero console errors or unhandled exceptions detected!")

    finally:
        driver.quit()

if __name__ == "__main__":
    run_browser_verification()
