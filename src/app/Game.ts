import * as THREE from 'three';
import { DEFAULT_GAME_CONFIG, GameConfig, GameModeType } from './GameConfig.ts';
import { EventBus } from './EventBus.ts';
import { InputManager } from './InputManager.ts';
import { SceneManager } from './SceneManager.ts';
import { GameLoop } from './GameLoop.ts';
import { CollisionWorld } from '../core/CollisionWorld.ts';
import { DebugOverlay } from '../core/DebugOverlay.ts';
import { SeededRandom } from '../core/Random.ts';
import { SettingsStore, UserSettings } from '../settings/SettingsStore.ts';
import { LightingSystem } from '../world/Lighting.ts';
import { MapFactory } from '../world/MapFactory.ts';
import { InteractablesManager } from '../world/Interactables.ts';
import { SPAWN_ZONES } from '../world/LevelData.ts';
import { PlayerController } from '../player/PlayerController.ts';
import { BallisticsSystem } from '../weapons/Ballistics.ts';
import { ProjectileSystem, ActiveGrenadeProjectile } from '../weapons/ProjectileSystem.ts';
import { GRENADE_DEFINITIONS, GrenadeType } from '../weapons/Grenades.ts';
import { HitboxTarget } from '../combat/Hitboxes.ts';
import { DamageSystem } from '../combat/DamageSystem.ts';
import { HitFeedbackState } from '../combat/HitFeedback.ts';
import { CombatEventLog } from '../combat/CombatEvents.ts';
import { BotManager } from '../bots/BotManager.ts';
import { BotAgent } from '../bots/BotAgent.ts';
import { PerceivableActor } from '../bots/BotPerception.ts';
import { RoundManager } from '../game/RoundManager.ts';
import { BombObjective } from '../game/BombObjective.ts';
import { EconomySystem } from '../game/Economy.ts';
import { MatchStats } from '../game/MatchStats.ts';
import { GameModeRules } from '../game/GameMode.ts';
import { AudioManager } from '../audio/AudioManager.ts';
import { MuzzleFlashEffect } from '../effects/MuzzleFlash.ts';
import { TracerSystem } from '../effects/Tracers.ts';
import { ImpactEffectsSystem } from '../effects/ImpactEffects.ts';
import { DecalSystem } from '../effects/Decals.ts';
import { ShellCasingSystem } from '../effects/ShellCasings.ts';
import { ParticleExplosionSystem } from '../effects/Particles.ts';
import { MainMenuUI } from '../ui/MainMenu.ts';
import { HudUI } from '../ui/HUD.ts';
import { BuyMenuUI } from '../ui/BuyMenu.ts';
import { ScoreboardUI } from '../ui/Scoreboard.ts';
import { PauseMenuUI } from '../ui/PauseMenu.ts';
import { SettingsMenuUI } from '../ui/SettingsMenu.ts';
import { ResultsScreenUI } from '../ui/ResultsScreen.ts';

/**
 * Top-level Game orchestrator connecting 3D rendering, physics/collision,
 * weapons & ballistics, autonomous bots, round state machine, economy, audio, and UI.
 */
export class Game {
  readonly config: GameConfig = { ...DEFAULT_GAME_CONFIG };
  readonly eventBus = new EventBus();
  readonly settingsStore: SettingsStore;
  readonly sceneManager: SceneManager;
  readonly lighting: LightingSystem;
  readonly collisionWorld = new CollisionWorld();
  readonly mapFactory = new MapFactory();
  readonly interactables: InteractablesManager;
  readonly input: InputManager;
  readonly rng = new SeededRandom(2026);
  readonly player: PlayerController;
  readonly ballistics: BallisticsSystem;
  readonly projectiles: ProjectileSystem;
  readonly botManager: BotManager;
  readonly roundManager: RoundManager;
  readonly bombObjective: BombObjective;
  readonly economy: EconomySystem;
  readonly stats = new MatchStats();
  readonly combatLog = new CombatEventLog();
  readonly hitFeedback = new HitFeedbackState();
  readonly audio = new AudioManager();
  readonly loop: GameLoop;

  // Visual effects
  readonly muzzleFlash: MuzzleFlashEffect;
  readonly tracers: TracerSystem;
  readonly impacts: ImpactEffectsSystem;
  readonly decals: DecalSystem;
  readonly shells: ShellCasingSystem;
  readonly explosions: ParticleExplosionSystem;

  // UI layers
  private mainMenuUI: MainMenuUI | null = null;
  private hudUI: HudUI | null = null;
  private buyMenuUI: BuyMenuUI | null = null;
  private scoreboardUI: ScoreboardUI | null = null;
  private pauseMenuUI: PauseMenuUI | null = null;
  private settingsMenuUI: SettingsMenuUI | null = null;
  private resultsScreenUI: ResultsScreenUI | null = null;
  private debugOverlay: DebugOverlay | null = null;

  private matchActive = false;
  private paused = false;
  private elapsedSeconds = 0;
  private announcementText: string | null = null;
  private announcementTimer = 0;
  private playerRespawnTimer = 0;
  private botRespawnTimers = new Map<string, number>();
  private bombTickAccum = 0;

  constructor(canvas?: HTMLCanvasElement, uiContainer?: HTMLElement | null) {
    this.settingsStore = new SettingsStore();
    const userSettings = this.settingsStore.get();
    this.config.mode = userSettings.preferredMode;
    this.config.difficulty = userSettings.difficulty;
    this.config.botCount = userSettings.preferredBotCount;

    this.sceneManager = new SceneManager(canvas);
    this.lighting = new LightingSystem(this.sceneManager.scene);
    this.mapFactory.buildMap(this.sceneManager.worldGroup, this.collisionWorld);
    this.interactables = new InteractablesManager(this.sceneManager.worldGroup);

    this.input = new InputManager(this.sceneManager.renderer.domElement);
    this.player = new PlayerController(this.sceneManager.camera, this.rng);
    this.ballistics = new BallisticsSystem(this.rng);
    this.projectiles = new ProjectileSystem(this.sceneManager.effectsGroup, this.eventBus);
    this.botManager = new BotManager(this.sceneManager.dynamicGroup, this.rng);
    this.roundManager = new RoundManager(this.config, this.eventBus);
    this.bombObjective = new BombObjective(
      this.config.bombFuseSeconds,
      this.config.bombPlantSeconds,
      this.config.bombDefuseSeconds
    );
    this.economy = new EconomySystem(this.config.startingMoney, this.config.maxMoney);

    this.muzzleFlash = new MuzzleFlashEffect(this.sceneManager.camera);
    this.tracers = new TracerSystem(this.sceneManager.effectsGroup);
    this.impacts = new ImpactEffectsSystem(this.sceneManager.effectsGroup);
    this.decals = new DecalSystem(this.sceneManager.effectsGroup);
    this.shells = new ShellCasingSystem(this.sceneManager.effectsGroup);
    this.explosions = new ParticleExplosionSystem(this.sceneManager.effectsGroup);

    this.applySettings(userSettings);
    this.settingsStore.onChange((newSettings) => this.applySettings(newSettings));

    this.wireEvents();
    if (uiContainer) {
      this.initUI(uiContainer);
    }

    // Position camera at an atmospheric overview of the Central Courtyard while in Main Menu
    this.player.spawnAt(new THREE.Vector3(0, 0, 38), 0, true);
    this.player.cameraCtrl.updateCamera(0.016, this.sceneManager.camera, this.player.movement.getEyePosition(), 0, true, 1.0);

    this.loop = new GameLoop((dt) => this.step(dt));
  }

  private wireEvents(): void {
    this.eventBus.on('sound:emitted', (ev) => {
      this.botManager.broadcastSoundToBots(
        ev.sourceId,
        ev.team,
        ev.position,
        ev.radius,
        this.elapsedSeconds
      );
    });

    this.eventBus.on('round:ended', (ev) => {
      this.announcementText = `ROUND ${ev.roundNumber}: ${ev.winner.toUpperCase()} WINS — ${ev.reason.toUpperCase()}`;
      this.announcementTimer = 3.8;
      this.stats.recordRoundOutcome(ev.roundNumber, ev.winner, ev.reason);
      if (this.config.mode === 'bomb_defusal') {
        const playerWon = ev.winner === this.player.team;
        const byObj = ev.reason.includes('Bomb');
        this.economy.awardRoundOutcome(playerWon, byObj);
      }
    });

    this.eventBus.on('match:ended', (ev) => {
      this.input.exitPointerLock();
      this.resultsScreenUI?.show(
        ev.winner,
        ev.alphaScore,
        ev.bravoScore,
        this.stats.getAllSorted()
      );
    });
  }

  private initUI(uiContainer: HTMLElement): void {
    const s = this.settingsStore.get();
    this.debugOverlay = new DebugOverlay(uiContainer);
    this.hudUI = new HudUI(uiContainer);
    this.scoreboardUI = new ScoreboardUI(uiContainer);

    this.mainMenuUI = new MainMenuUI(
      uiContainer,
      s.preferredMode,
      s.difficulty,
      s.preferredBotCount,
      {
        onStartMatch: (mode, diff, botCount) => {
          this.audio.unlockAudioContext();
          this.settingsStore.update({
            preferredMode: mode,
            difficulty: diff,
            preferredBotCount: botCount
          });
          this.startMatch(mode, diff, botCount);
        },
        onOpenSettings: () => {
          this.audio.unlockAudioContext();
          this.settingsMenuUI?.open();
        }
      }
    );

    this.buyMenuUI = new BuyMenuUI(uiContainer, {
      onBuyWeapon: (weaponId) => this.purchaseWeapon(weaponId),
      onBuyGrenade: (type) => this.purchaseGrenade(type),
      onBuyArmor: (withHelmet) => this.purchaseArmor(withHelmet),
      onClose: () => {
        this.buyMenuUI?.close();
        if (this.matchActive && !this.paused) {
          this.input.requestPointerLock();
        }
      }
    });

    this.pauseMenuUI = new PauseMenuUI(uiContainer, {
      onResume: () => this.resumeMatch(),
      onOpenBuyMenu: () => {
        this.pauseMenuUI?.setVisible(false);
        this.openBuyMenu();
      },
      onOpenSettings: () => this.settingsMenuUI?.open(),
      onRestartMatch: () => {
        this.pauseMenuUI?.setVisible(false);
        this.startMatch(this.config.mode, this.config.difficulty, this.config.botCount);
      },
      onReturnToMainMenu: () => this.returnToMainMenu()
    });

    this.settingsMenuUI = new SettingsMenuUI(uiContainer, this.settingsStore, () => {
      this.audio.playSoundId('ui_click');
    });

    this.resultsScreenUI = new ResultsScreenUI(uiContainer, {
      onPlayAgain: () => this.startMatch(this.config.mode, this.config.difficulty, this.config.botCount),
      onMainMenu: () => this.returnToMainMenu()
    });

    // Click canvas during match to re-acquire pointer lock
    this.sceneManager.renderer.domElement.addEventListener('click', () => {
      this.audio.unlockAudioContext();
      if (this.matchActive && !this.paused && !this.buyMenuUI?.isOpen() && !this.settingsMenuUI?.isOpen()) {
        this.input.requestPointerLock();
      }
    });
  }

  applySettings(settings: UserSettings): void {
    this.config.difficulty = settings.difficulty;
    this.player.cameraCtrl.setSensitivity(settings.mouseSensitivityX, settings.mouseSensitivityY);
    this.player.cameraCtrl.setBaseFov(settings.fov);
    this.audio.setVolumes(settings.masterVolume, settings.sfxVolume, settings.musicVolume, settings.muted);
    this.sceneManager.applyGraphicsSettings(settings.graphics);
    this.impacts.setEnabled(settings.graphics.particlesEnabled);
    this.decals.setEnabled(settings.graphics.decalsEnabled);
    this.shells.setEnabled(settings.graphics.shellCasingsEnabled);
    this.input.setBindings(settings.keyBindings);
    this.botManager.setDifficulty(settings.difficulty);
  }

  startMatch(
    mode: GameModeType = this.config.mode,
    difficulty: number = this.config.difficulty,
    botCount: number = this.config.botCount
  ): void {
    this.config.mode = mode;
    this.config.difficulty = difficulty;
    this.config.botCount = botCount;
    this.botManager.setDifficulty(difficulty);

    this.matchActive = true;
    this.paused = false;
    this.loop.clock.resume();
    this.mainMenuUI?.setVisible(false);
    this.pauseMenuUI?.setVisible(false);
    this.buyMenuUI?.close();
    this.resultsScreenUI?.hide();

    this.player.team = mode === 'ffa_deathmatch' ? 'ffa' : 'alpha';
    const startCash = mode === 'bomb_defusal' ? 800 : 4500;
    this.economy.reset(startCash);
    this.stats.reset();
    this.combatLog.reset();
    this.hitFeedback.reset();

    this.stats.registerParticipant(this.player.id, this.player.name, this.player.team);
    this.botManager.spawnBotsForMatch(botCount, mode, 1);
    for (const bot of this.botManager.getBots()) {
      this.stats.registerParticipant(bot.id, bot.name, bot.team);
    }

    this.roundManager.configure(this.config);
    this.roundManager.startMatch();
    this.resetRoundEntities(true);

    this.announcementText = `MISSION START — ${mode.toUpperCase().replace('_', ' ')}`;
    this.announcementTimer = 3.0;
    this.input.requestPointerLock();
  }

  resetRoundEntities(fullWeaponReset = false): void {
    this.combatLog.clearRoundDeaths();
    this.bombObjective.reset();
    this.interactables.hidePlantedBomb();
    this.projectiles.clearAll();
    this.tracers.clear();
    this.impacts.clear();
    this.shells.clear();
    this.explosions.clear();
    this.playerRespawnTimer = 0;
    this.botRespawnTimers.clear();

    const pSpawn = SPAWN_ZONES[this.player.team];
    this.player.spawnAt(pSpawn.points[0], pSpawn.facingYaw, fullWeaponReset);
    this.stats.setAliveStatus(this.player.id, true);

    this.botManager.resetBotsForNewRound(this.config.mode, this.roundManager.getRoundNumber());
    for (const bot of this.botManager.getBots()) {
      this.stats.setAliveStatus(bot.id, true);
    }
  }

  pauseMatch(): void {
    if (!this.matchActive || this.paused) return;
    this.paused = true;
    this.loop.clock.pause();
    this.input.exitPointerLock();
    this.pauseMenuUI?.setVisible(true);
  }

  resumeMatch(): void {
    if (!this.matchActive) return;
    this.paused = false;
    this.loop.clock.resume();
    this.pauseMenuUI?.setVisible(false);
    this.buyMenuUI?.close();
    this.settingsMenuUI?.close();
    this.input.requestPointerLock();
  }

  returnToMainMenu(): void {
    this.matchActive = false;
    this.paused = false;
    this.input.exitPointerLock();
    this.pauseMenuUI?.setVisible(false);
    this.buyMenuUI?.close();
    this.resultsScreenUI?.hide();
    this.hudUI?.update(this.buildHudState(false));
    this.mainMenuUI?.setVisible(true);
  }

  openBuyMenu(): void {
    if (!this.matchActive) return;
    this.input.exitPointerLock();
    const equippedIds = ([1, 2, 3] as const)
      .map((s) => this.player.weapons.getWeaponInSlot(s)?.def.id)
      .filter((Boolean as any)) as string[];
    this.buyMenuUI?.open(this.economy.getMoney(), equippedIds, this.roundManager.isBuyAllowed());
  }

  purchaseWeapon(weaponId: string): { success: boolean; message: string } {
    const equippedIds = ([1, 2, 3] as const)
      .map((s) => this.player.weapons.getWeaponInSlot(s)?.def.id)
      .filter((Boolean as any)) as string[];
    const res = this.economy.tryPurchaseWeapon(weaponId, equippedIds, this.roundManager.isBuyAllowed());
    if (res.success) {
      this.player.weapons.equipWeaponById(weaponId);
      this.audio.playSoundId('weapon_switch');
      const updatedEquipped = ([1, 2, 3] as const)
        .map((s) => this.player.weapons.getWeaponInSlot(s)?.def.id)
        .filter((Boolean as any)) as string[];
      this.buyMenuUI?.render(this.economy.getMoney(), updatedEquipped, this.roundManager.isBuyAllowed());
      return { success: true, message: `Purchased and equipped ${weaponId}.` };
    }
    this.buyMenuUI?.render(this.economy.getMoney(), equippedIds, this.roundManager.isBuyAllowed());
    return { success: false, message: res.reason || 'Purchase failed' };
  }

  purchaseGrenade(type: GrenadeType): { success: boolean; message: string } {
    const res = this.economy.tryPurchaseGrenade(
      type,
      this.player.grenades.canAdd(type),
      this.roundManager.isBuyAllowed()
    );
    if (res.success) {
      this.player.grenades.addGrenade(type);
      this.audio.playSoundId('ui_click');
    }
    const equippedIds = ([1, 2, 3] as const)
      .map((s) => this.player.weapons.getWeaponInSlot(s)?.def.id)
      .filter((Boolean as any)) as string[];
    this.buyMenuUI?.render(this.economy.getMoney(), equippedIds, this.roundManager.isBuyAllowed());
    return { success: res.success, message: res.success ? `Purchased ${type} grenade.` : res.reason || 'Failed' };
  }

  purchaseArmor(withHelmet: boolean): { success: boolean; message: string } {
    const res = this.economy.tryPurchaseArmor(
      withHelmet,
      this.player.health.getArmor(),
      this.player.health.hasHelmetProtection(),
      this.roundManager.isBuyAllowed()
    );
    if (res.success) {
      this.player.health.grantArmor(100, withHelmet);
      this.audio.playSoundId('ui_click');
    }
    const equippedIds = ([1, 2, 3] as const)
      .map((s) => this.player.weapons.getWeaponInSlot(s)?.def.id)
      .filter((Boolean as any)) as string[];
    this.buyMenuUI?.render(this.economy.getMoney(), equippedIds, this.roundManager.isBuyAllowed());
    return { success: res.success, message: res.success ? 'Armor replenished.' : res.reason || 'Failed' };
  }

  /**
   * Advances the entire game simulation by dt seconds.
   */
  step(dt: number): void {
    // Handle global UI toggle keys before early-outs
    if (this.input.wasActionJustPressed('debugOverlay')) {
      this.debugOverlay?.toggle();
    }

    if (this.matchActive && this.input.wasActionJustPressed('pause')) {
      if (this.settingsMenuUI?.isOpen()) {
        this.settingsMenuUI.close();
      } else if (this.buyMenuUI?.isOpen()) {
        this.buyMenuUI.close();
        this.input.requestPointerLock();
      } else if (this.paused) {
        this.resumeMatch();
      } else {
        this.pauseMatch();
      }
    }

    if (this.matchActive && !this.paused && this.input.wasActionJustPressed('buyMenu')) {
      if (this.buyMenuUI?.isOpen()) {
        this.buyMenuUI.close();
        this.input.requestPointerLock();
      } else {
        this.openBuyMenu();
      }
    }

    if (!this.matchActive || this.paused) {
      this.sceneManager.render();
      this.input.endFrame();
      return;
    }

    this.elapsedSeconds += dt;
    if (this.announcementTimer > 0) {
      this.announcementTimer = Math.max(0, this.announcementTimer - dt);
      if (this.announcementTimer <= 0) {
        this.announcementText = null;
      }
    }

    // 1. Update Round Manager
    const roundStep = this.roundManager.update(dt);
    if (roundStep.startNextRoundNow) {
      this.resetRoundEntities(false);
    }

    const uiBlockingInput = Boolean(this.buyMenuUI?.isOpen() || this.settingsMenuUI?.isOpen());
    const allowMoveAndCombat = this.roundManager.isMovementAllowed() && !uiBlockingInput;

    // 2. Update Player Controller
    const pRes = this.player.update(
      dt,
      this.input,
      this.sceneManager.camera,
      this.collisionWorld,
      allowMoveAndCombat
    );

    this.audio.updateListener(
      this.player.movement.getEyePosition(),
      this.player.cameraCtrl.getAimDirection()
    );

    if (pRes.stepped) {
      this.audio.playFootstep(pRes.surface);
      this.eventBus.emit('sound:emitted', {
        sourceId: this.player.id,
        team: this.player.team,
        position: this.player.movement.position.clone(),
        radius: this.player.movement.isSprinting() ? 24 : 14,
        category: 'footstep'
      });
    }
    if (pRes.reloadStarted) {
      this.audio.playSoundId('reload_click');
    }
    if (pRes.weaponSwitched) {
      this.audio.playSoundId('weapon_switch');
    }

    if (pRes.wantsFire && this.roundManager.isCombatAllowed()) {
      this.firePlayerWeapon();
    }
    if (pRes.wantsThrowGrenade && this.roundManager.isCombatAllowed()) {
      this.throwPlayerGrenade();
    }

    // 3. Handle Player C4 Bomb Plant / Defuse Interactions
    this.updateBombInteractions(dt, pRes.wantsInteract);

    // 4. Update Projectiles & Grenades
    this.projectiles.update(dt, this.elapsedSeconds, this.collisionWorld, (proj) => {
      this.handleGrenadeDetonation(proj);
    });

    // 5. Update Autonomous Bots
    this.updateBots(dt);

    // 6. Handle Mid-Round Respawns for TDM & FFA
    if (this.roundManager.canRespawnMidRound()) {
      this.updateDeathmatchRespawns(dt);
      if (roundStep.timeExpiredInActive) {
        GameModeRules.evaluateDeathmatchTimerExpiry(this.config, this.roundManager, this.stats);
      }
    } else if (this.config.mode === 'bomb_defusal') {
      const alphaAlive =
        (this.player.team === 'alpha' && this.player.health.isAlive() ? 1 : 0) +
        this.botManager.getBots().filter((b) => b.team === 'alpha' && b.health.isAlive()).length;
      const bravoAlive =
        (this.player.team === 'bravo' && this.player.health.isAlive() ? 1 : 0) +
        this.botManager.getBots().filter((b) => b.team === 'bravo' && b.health.isAlive()).length;

      GameModeRules.evaluateBombDefusalState(
        this.roundManager,
        this.bombObjective,
        alphaAlive,
        bravoAlive,
        roundStep.timeExpiredInActive
      );
    }

    // 7. Update Visual Effects, UI, Scoreboard, and Telemetry
    this.muzzleFlash.update(dt);
    this.tracers.update(dt);
    this.impacts.update(dt);
    this.decals.update(dt);
    this.shells.update(dt);
    this.explosions.update(dt);
    this.hitFeedback.update(dt);
    this.interactables.update(dt, this.bombObjective.getFuseRatio());

    const showTab = this.input.isActionActive('scoreboard');
    this.scoreboardUI?.setVisible(
      showTab,
      this.stats.getAllSorted(),
      this.roundManager.getAlphaScore(),
      this.roundManager.getBravoScore(),
      this.config.mode
    );

    const hudState = this.buildHudState(true);
    this.hudUI?.update(hudState);

    this.debugOverlay?.update({
      fps: this.loop.clock.getFps(),
      frameTimeMs: this.loop.clock.getFrameTimeMs(),
      activeBots: this.botManager.getBots().filter((b) => b.health.isAlive()).length,
      drawCalls: this.sceneManager.renderer.info.render.calls,
      triangles: this.sceneManager.renderer.info.render.triangles,
      currentSpreadDeg: hudState.spreadDeg,
      recoilPitchDeg: this.player.weapons.recoil.getPitchDeg(),
      recoilYawDeg: this.player.weapons.recoil.getYawDeg(),
      playerPos: {
        x: this.player.movement.position.x,
        y: this.player.movement.position.y,
        z: this.player.movement.position.z
      },
      roundState: this.roundManager.getPhase()
    });

    this.sceneManager.render();
    this.input.endFrame();
  }

  /**
   * Fires the player's currently equipped weapon if ready, executing hitscan ballistics,
   * wall blocking, anatomical damage, recoil, audio, and visual effects.
   */
  firePlayerWeapon(): boolean {
    if (!this.player.health.isAlive() || !this.roundManager.isCombatAllowed()) {
      return false;
    }
    const weaponInst = this.player.weapons.getCurrentWeapon();
    if (!weaponInst.canFire()) {
      if (weaponInst.magazineAmmo <= 0 && !weaponInst.reloader.isReloading()) {
        this.audio.playSoundId('dry_fire');
      }
      return false;
    }

    weaponInst.consumeShot();
    const recoilSample = this.player.weapons.notifyShotFired();
    this.debugOverlay?.recordRecoilSample(recoilSample.pitchDeg, recoilSample.yawDeg);

    const eyeOrigin = this.player.movement.getEyePosition();
    const aimDir = this.player.cameraCtrl.getAimDirection();
    const moveCtx = this.player.getShooterMovementContext();
    const targets = this.collectHitboxTargets();

    const shotOutcome = this.ballistics.fireWeaponRays(
      eyeOrigin,
      aimDir,
      weaponInst.def,
      moveCtx,
      this.collisionWorld,
      targets,
      this.player.id
    );

    this.audio.playWeaponFire(weaponInst.def);
    if (weaponInst.def.category !== 'melee') {
      this.muzzleFlash.trigger(this.player.weapons.getAds());
      const muzzlePos = this.player.weapons.getMuzzleWorldPosition(this.sceneManager.camera);
      const rightVec = new THREE.Vector3(1, 0, 0).applyQuaternion(this.sceneManager.camera.quaternion);
      this.shells.spawnShell(muzzlePos, rightVec);

      this.eventBus.emit('sound:emitted', {
        sourceId: this.player.id,
        team: this.player.team,
        position: this.player.movement.position.clone(),
        radius: 55,
        category: 'gunshot'
      });
    }

    const muzzleWorld = this.player.weapons.getMuzzleWorldPosition(this.sceneManager.camera);
    for (const ray of shotOutcome.rays) {
      if (weaponInst.def.category !== 'melee') {
        this.tracers.spawnTracer(muzzleWorld, ray.endPoint);
      }

      if (ray.hitType === 'world') {
        this.impacts.spawnImpact(ray.endPoint, ray.hitNormal, ray.surfaceType || 'concrete');
        this.decals.spawnBulletDecal(ray.endPoint, ray.hitNormal);
      } else if (ray.hitType === 'target' && ray.targetId && ray.region) {
        const bot = this.botManager.getBotById(ray.targetId);
        if (bot && bot.health.isAlive()) {
          // Friendly fire check in team modes
          if (this.player.team !== 'ffa' && bot.team === this.player.team) {
            continue;
          }
          const dmgRes = DamageSystem.applyWeaponHit(
            weaponInst.def,
            ray.distance,
            ray.region,
            bot.health
          );
          this.impacts.spawnImpact(ray.endPoint, ray.hitNormal, 'flesh');
          this.hitFeedback.triggerHitMarker(dmgRes.headshot, dmgRes.fatal);
          this.audio.playSoundId(dmgRes.headshot ? 'headshot_ding' : 'hit_marker');

          if (dmgRes.fatal) {
            this.handleActorDeath(
              this.player.id,
              this.player.name,
              this.player.team,
              bot.id,
              bot.name,
              bot.team,
              weaponInst.def.id,
              weaponInst.def.name,
              dmgRes.headshot
            );
            bot.onKilled();
            if (this.roundManager.canRespawnMidRound()) {
              this.botRespawnTimers.set(bot.id, 3.0);
            }
          }
        }
      }
    }

    return true;
  }

  throwPlayerGrenade(): boolean {
    if (!this.player.health.isAlive() || !this.roundManager.isCombatAllowed()) return false;
    const gType = this.player.grenades.consumeThrow();
    if (!gType) return false;

    const origin = this.player.movement.getEyePosition();
    const dir = this.player.cameraCtrl.getAimDirection();
    this.projectiles.spawnGrenade(this.player.id, this.player.team, gType, origin, dir);
    return true;
  }

  private handleGrenadeDetonation(proj: ActiveGrenadeProjectile): void {
    const def = GRENADE_DEFINITIONS[proj.type];
    const blastOrigin = proj.position.clone().add(new THREE.Vector3(0, 0.35, 0));

    if (proj.type === 'frag') {
      this.explosions.spawnExplosion(proj.position, def.effectRadius * 0.5, 0xf97316);
      this.decals.spawnBulletDecal(proj.position, new THREE.Vector3(0, 1, 0), 4.0);
      this.audio.playSoundId('explosion_frag', proj.position, 85);

      // Evaluate frag blast damage against player and all bots with strict LOS check
      const evaluateBlastTarget = (
        id: string,
        name: string,
        team: 'alpha' | 'bravo' | 'ffa',
        chestPos: THREE.Vector3,
        health: PlayerController['health'],
        onFatal: () => void
      ) => {
        if (!health.isAlive()) return;
        const dist = blastOrigin.distanceTo(chestPos);
        if (dist > def.effectRadius) return;
        const hasLos = this.collisionWorld.hasLineOfSight(blastOrigin, chestPos, false);
        const dmg = DamageSystem.computeExplosionDamage(dist, def.effectRadius, def.maxDamage, hasLos);
        if (dmg > 0) {
          const applied = health.applyDamage(dmg, 0.75, false);
          if (id === this.player.id) {
            this.hitFeedback.triggerIncomingDamage(applied.healthDamage);
          }
          if (applied.fatal) {
            this.handleActorDeath(
              proj.throwerId,
              proj.throwerId === this.player.id ? this.player.name : 'BOT',
              proj.throwerTeam,
              id,
              name,
              team,
              'frag',
              def.name,
              false
            );
            onFatal();
          }
        }
      };

      evaluateBlastTarget(
        this.player.id,
        this.player.name,
        this.player.team,
        this.player.movement.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
        this.player.health,
        () => {
          if (this.roundManager.canRespawnMidRound()) {
            this.playerRespawnTimer = 3.0;
          }
        }
      );

      for (const bot of this.botManager.getBots()) {
        evaluateBlastTarget(
          bot.id,
          bot.name,
          bot.team,
          bot.position.clone().add(new THREE.Vector3(0, 1.0, 0)),
          bot.health,
          () => {
            bot.onKilled();
            if (this.roundManager.canRespawnMidRound()) {
              this.botRespawnTimers.set(bot.id, 3.0);
            }
          }
        );
      }
    } else if (proj.type === 'smoke') {
      this.audio.playSoundId('smoke_deploy', proj.position, 45);
    } else if (proj.type === 'flash') {
      this.explosions.spawnExplosion(proj.position, 2.0, 0xffffff);
      this.audio.playSoundId('explosion_frag', proj.position, 60);

      // Flashbang LOS & view-angle check for player
      const pEye = this.player.movement.getEyePosition();
      const distToPlayer = pEye.distanceTo(blastOrigin);
      if (distToPlayer <= def.effectRadius && this.collisionWorld.hasLineOfSight(blastOrigin, pEye, true)) {
        const toFlash = blastOrigin.clone().sub(pEye).normalize();
        const lookDot = this.player.cameraCtrl.getAimDirection().dot(toFlash);
        const angleFactor = lookDot > 0.2 ? 1.0 : 0.35;
        const distFactor = 1 - distToPlayer / def.effectRadius;
        this.hitFeedback.triggerFlashbang(angleFactor * distFactor * 0.95);
      }

      // Flashbang LOS check for bots
      for (const bot of this.botManager.getBots()) {
        if (!bot.health.isAlive()) continue;
        const bEye = bot.getEyePosition();
        const d = bEye.distanceTo(blastOrigin);
        if (d <= def.effectRadius && this.collisionWorld.hasLineOfSight(blastOrigin, bEye, true)) {
          bot.perception.applyFlashBlindness((1 - d / def.effectRadius) * def.effectDurationSeconds);
        }
      }
    }
  }

  private updateBombInteractions(dt: number, playerHoldingInteract: boolean): void {
    if (this.config.mode !== 'bomb_defusal') return;

    // Update planted C4 fuse countdown
    if (this.bombObjective.isPlanted()) {
      const fuseRes = this.bombObjective.updateFuse(dt);
      this.bombTickAccum += dt;
      const tickInterval = Math.max(0.15, this.bombObjective.getFuseRatio() * 0.95);
      if (this.bombTickAccum >= tickInterval) {
        this.bombTickAccum = 0;
        const bombPos = this.bombObjective.getPlantedPosition();
        if (bombPos) {
          this.audio.playSoundId('bomb_beep', bombPos, 55);
        }
      }

      if (fuseRes.exploded) {
        const bombPos = this.bombObjective.getPlantedPosition() || new THREE.Vector3();
        this.explosions.spawnExplosion(bombPos, 12.0, 0xef4444);
        this.audio.playSoundId('explosion_frag', bombPos, 110);
        this.interactables.hidePlantedBomb();
      }
    }

    if (!this.player.health.isAlive()) return;

    const pPos = this.player.movement.position;
    const site = this.interactables.getBombSiteAtPosition(pPos);

    // Player is Attacker ('alpha') planting C4
    if (this.player.team === 'alpha' && !this.bombObjective.isPlanted() && site) {
      if (playerHoldingInteract) {
        const planted = this.bombObjective.updatePlanting(dt, this.player.id, site.id, pPos);
        if (planted) {
          this.onBombPlanted(this.player.id, site.id, pPos);
        }
      } else {
        this.bombObjective.cancelPlanting(this.player.id);
      }
    } else if (this.player.team === 'alpha') {
      this.bombObjective.cancelPlanting(this.player.id);
    }

    // Player is Defender ('bravo') defusing C4
    const plantedPos = this.bombObjective.getPlantedPosition();
    if (this.player.team === 'bravo' && this.bombObjective.isPlanted() && plantedPos) {
      if (pPos.distanceTo(plantedPos) <= 3.2 && playerHoldingInteract) {
        const defused = this.bombObjective.updateDefusing(dt, this.player.id);
        if (defused) {
          this.onBombDefused(this.player.id);
        }
      } else {
        this.bombObjective.cancelDefusing(this.player.id);
      }
    }
  }

  private onBombPlanted(planterId: string, siteId: 'A' | 'B', pos: THREE.Vector3): void {
    this.roundManager.notifyBombPlanted();
    this.interactables.showPlantedBomb(pos);
    this.stats.recordBombPlant(planterId);
    if (planterId === this.player.id) {
      this.economy.addMoney(300);
    }
    this.announcementText = `ALERT: C4 PLANTED AT BOMB SITE ${siteId}!`;
    this.announcementTimer = 3.5;
    this.audio.playSoundId('bomb_beep', pos, 80);
  }

  private onBombDefused(defuserId: string): void {
    this.interactables.hidePlantedBomb();
    this.stats.recordBombDefuse(defuserId);
    if (defuserId === this.player.id) {
      this.economy.addMoney(300);
    }
    this.announcementText = 'C4 BOMB DEFUSED!';
    this.announcementTimer = 3.5;
  }

  private updateBots(dt: number): void {
    const actors: PerceivableActor[] = [];
    if (this.player.health.isAlive()) {
      actors.push({
        id: this.player.id,
        team: this.player.team,
        feetPosition: this.player.movement.position.clone(),
        eyePosition: this.player.movement.getEyePosition(),
        alive: true
      });
    }
    for (const b of this.botManager.getBots()) {
      if (b.health.isAlive()) {
        actors.push({
          id: b.id,
          team: b.team,
          feetPosition: b.position.clone(),
          eyePosition: b.getEyePosition(),
          alive: true
        });
      }
    }

    const hitboxTargets = this.collectHitboxTargets();
    const profile = this.botManager.getDifficultyProfile();
    const phase = this.roundManager.getPhase();
    const bombPlanted = this.bombObjective.isPlanted();
    const plantedPos = this.bombObjective.getPlantedPosition();

    for (const bot of this.botManager.getBots()) {
      if (!bot.health.isAlive()) continue;

      const objTarget = this.botManager.squadCoordinator.getObjectiveTargetPosition(
        bot.id,
        bot.team,
        bot.indexInTeam,
        bombPlanted,
        plantedPos
      );
      const insideSite = this.interactables.getBombSiteAtPosition(bot.position);

      const botRes = bot.update(
        dt,
        this.elapsedSeconds,
        profile,
        this.botManager.navigation,
        this.collisionWorld,
        actors,
        objTarget,
        this.config.mode,
        phase,
        Boolean(insideSite),
        bombPlanted,
        plantedPos
      );

      if (botRes.spottedTarget) {
        this.botManager.relaySquadTargetCallout(
          bot,
          botRes.spottedTarget.id,
          botRes.spottedTarget.position,
          this.elapsedSeconds
        );
      }

      if (botRes.completedPlant && insideSite && !this.bombObjective.isPlanted()) {
        this.bombObjective.plantImmediately(bot.id, insideSite.id, bot.position);
        this.onBombPlanted(bot.id, insideSite.id, bot.position);
      }

      if (botRes.completedDefuse && this.bombObjective.isPlanted()) {
        this.bombObjective.defuseImmediately();
        this.onBombDefused(bot.id);
      }

      if (botRes.wantsFire && this.roundManager.isCombatAllowed() && bot.weapon.consumeShot()) {
        this.executeBotShot(bot, botRes.aimDirection, hitboxTargets);
      }
    }
  }

  private executeBotShot(bot: BotAgent, aimDir: THREE.Vector3, targets: HitboxTarget[]): void {
    const origin = bot.getEyePosition();
    const spreadCtx = {
      horizontalSpeed: 2.0,
      grounded: true,
      crouching: bot.crouching,
      sprinting: false,
      ads: false,
      accumulatedSpreadDeg: bot.weapon.getAccumulatedSpreadDeg()
    };

    const shotRes = this.ballistics.fireWeaponRays(
      origin,
      aimDir,
      bot.weapon.def,
      spreadCtx,
      this.collisionWorld,
      targets,
      bot.id
    );

    this.audio.playWeaponFire(bot.weapon.def, bot.position);
    this.eventBus.emit('sound:emitted', {
      sourceId: bot.id,
      team: bot.team,
      position: bot.position.clone(),
      radius: 50,
      category: 'gunshot'
    });

    for (const ray of shotRes.rays) {
      this.tracers.spawnTracer(origin, ray.endPoint);
      if (ray.hitType === 'world') {
        this.impacts.spawnImpact(ray.endPoint, ray.hitNormal, ray.surfaceType || 'concrete');
      } else if (ray.hitType === 'target' && ray.targetId && ray.region) {
        if (ray.targetId === this.player.id && this.player.health.isAlive()) {
          if (bot.team !== 'ffa' && bot.team === this.player.team) continue;
          const dmgRes = DamageSystem.applyWeaponHit(
            bot.weapon.def,
            ray.distance,
            ray.region,
            this.player.health
          );
          this.hitFeedback.triggerIncomingDamage(dmgRes.healthDamage);
          this.player.cameraCtrl.triggerDamagePunch(0.03);

          if (dmgRes.fatal) {
            this.handleActorDeath(
              bot.id,
              bot.name,
              bot.team,
              this.player.id,
              this.player.name,
              this.player.team,
              bot.weapon.def.id,
              bot.weapon.def.name,
              dmgRes.headshot
            );
            if (this.roundManager.canRespawnMidRound()) {
              this.playerRespawnTimer = 3.0;
            }
          }
        } else {
          const victimBot = this.botManager.getBotById(ray.targetId);
          if (victimBot && victimBot.health.isAlive()) {
            if (bot.team !== 'ffa' && bot.team === victimBot.team) continue;
            const dmgRes = DamageSystem.applyWeaponHit(
              bot.weapon.def,
              ray.distance,
              ray.region,
              victimBot.health
            );
            if (dmgRes.fatal) {
              this.handleActorDeath(
                bot.id,
                bot.name,
                bot.team,
                victimBot.id,
                victimBot.name,
                victimBot.team,
                bot.weapon.def.id,
                bot.weapon.def.name,
                dmgRes.headshot
              );
              victimBot.onKilled();
              if (this.roundManager.canRespawnMidRound()) {
                this.botRespawnTimers.set(victimBot.id, 3.0);
              }
            }
          }
        }
      }
    }
  }

  private handleActorDeath(
    killerId: string,
    killerName: string,
    killerTeam: 'alpha' | 'bravo' | 'ffa',
    victimId: string,
    victimName: string,
    victimTeam: 'alpha' | 'bravo' | 'ffa',
    weaponId: string,
    weaponName: string,
    headshot: boolean
  ): void {
    const recorded = this.combatLog.recordKill(
      killerName,
      killerTeam,
      victimId,
      victimName,
      victimTeam,
      weaponName,
      headshot,
      this.elapsedSeconds
    );
    if (!recorded) return;

    this.stats.recordKill(killerId, victimId, headshot);
    if (killerId === this.player.id && victimId !== this.player.id) {
      this.economy.awardKill(weaponId);
    }

    GameModeRules.evaluateDeathmatchKill(
      this.config,
      this.roundManager,
      this.stats,
      killerId,
      killerTeam
    );
  }

  private updateDeathmatchRespawns(dt: number): void {
    if (!this.player.health.isAlive() && this.playerRespawnTimer > 0) {
      this.playerRespawnTimer -= dt;
      if (this.playerRespawnTimer <= 0) {
        const z = SPAWN_ZONES[this.player.team];
        const pt = z.points[this.rng.intRange(0, z.points.length - 1)];
        this.player.spawnAt(pt, z.facingYaw, false);
        this.combatLog.clearVictimLock(this.player.id);
        this.stats.setAliveStatus(this.player.id, true);
      }
    }

    for (const [botId, rem] of Array.from(this.botRespawnTimers.entries())) {
      const next = rem - dt;
      if (next <= 0) {
        this.botRespawnTimers.delete(botId);
        const bot = this.botManager.getBotById(botId);
        if (bot) {
          this.botManager.respawnBot(bot);
          this.combatLog.clearVictimLock(bot.id);
          this.stats.setAliveStatus(bot.id, true);
        }
      } else {
        this.botRespawnTimers.set(botId, next);
      }
    }
  }

  private collectHitboxTargets(): HitboxTarget[] {
    const list: HitboxTarget[] = [];
    if (this.player.health.isAlive()) {
      list.push({
        id: this.player.id,
        team: this.player.team,
        feetPosition: this.player.movement.position,
        crouching: this.player.movement.isCrouching(),
        alive: true
      });
    }
    for (const b of this.botManager.getBots()) {
      if (b.health.isAlive()) {
        list.push({
          id: b.id,
          team: b.team,
          feetPosition: b.position,
          crouching: b.crouching,
          alive: true
        });
      }
    }
    return list;
  }

  private buildHudState(visible: boolean) {
    const curWep = this.player.weapons.getCurrentWeapon();
    const spreadDeg = this.ballistics.computeSpreadDegrees(
      curWep.def,
      this.player.getShooterMovementContext()
    );
    const pStats = this.stats.getParticipant(this.player.id);

    let interactionPrompt: string | null = null;
    let interactionProgress = 0;
    if (this.config.mode === 'bomb_defusal' && this.player.health.isAlive()) {
      const site = this.interactables.getBombSiteAtPosition(this.player.movement.position);
      if (this.player.team === 'alpha' && !this.bombObjective.isPlanted() && site) {
        interactionPrompt = `HOLD [E] TO PLANT C4 AT SITE ${site.id}`;
        interactionProgress = this.bombObjective.getPlantProgressRatio();
      } else if (this.player.team === 'bravo' && this.bombObjective.isPlanted()) {
        const bPos = this.bombObjective.getPlantedPosition();
        if (bPos && this.player.movement.position.distanceTo(bPos) <= 3.2) {
          interactionPrompt = 'HOLD [E] TO DEFUSE C4 BOMB';
          interactionProgress = this.bombObjective.getDefuseProgressRatio();
        }
      }
    }

    const teammatePositions = this.botManager
      .getBots()
      .filter((b) => this.player.team !== 'ffa' && b.team === this.player.team)
      .map((b) => ({ x: b.position.x, z: b.position.z, alive: b.health.isAlive() }));

    // Only show enemy on minimap if player has direct line-of-sight right now
    const pEye = this.player.movement.getEyePosition();
    const spottedEnemies = this.botManager
      .getBots()
      .filter(
        (b) =>
          b.health.isAlive() &&
          (this.player.team === 'ffa' || b.team !== this.player.team) &&
          this.collisionWorld.hasLineOfSight(pEye, b.getEyePosition(), true)
      )
      .map((b) => ({ x: b.position.x, z: b.position.z }));

    return {
      visible,
      health: this.player.health.getHealth(),
      armor: this.player.health.getArmor(),
      hasHelmet: this.player.health.hasHelmetProtection(),
      money: this.economy.getMoney(),
      weaponName: curWep.def.name,
      weaponCategory: curWep.def.category,
      fireMode: curWep.def.fireMode,
      magazineAmmo: curWep.magazineAmmo,
      reserveAmmo: curWep.reserveAmmo,
      isReloading: curWep.reloader.isReloading(),
      reloadProgress: curWep.reloader.getProgress(),
      activeSlot: this.player.weapons.getActiveSlot(),
      selectedGrenade: this.player.grenades.getSelectedType(),
      grenadeCounts: {
        frag: this.player.grenades.getCount('frag'),
        smoke: this.player.grenades.getCount('smoke'),
        flash: this.player.grenades.getCount('flash'),
        decoy: this.player.grenades.getCount('decoy')
      },
      spreadDeg,
      isAds: this.player.weapons.getAds(),
      isScopedSniper: this.player.weapons.getAds() && curWep.def.category === 'sniper',
      alphaScore: this.roundManager.getAlphaScore(),
      bravoScore: this.roundManager.getBravoScore(),
      roundNumber: this.roundManager.getRoundNumber(),
      roundPhase: this.roundManager.getPhase(),
      phaseTimerSec: this.roundManager.getPhaseTimer(),
      gameMode: this.config.mode,
      playerKills: pStats?.kills ?? 0,
      playerDeaths: pStats?.deaths ?? 0,
      bombPlanted: this.bombObjective.isPlanted(),
      bombSite: this.bombObjective.getPlantedSite(),
      bombFuseRemaining: this.bombObjective.getFuseRemaining(),
      interactionPrompt,
      interactionProgress,
      announcementBanner: this.announcementText,
      hitMarker: this.hitFeedback.getHitMarkerState(),
      damageFlashAlpha: this.hitFeedback.getDamageFlashAlpha(),
      flashbangAlpha: this.hitFeedback.getFlashbangAlpha(),
      killFeed: this.combatLog.getActiveFeed(this.elapsedSeconds),
      playerPos: this.player.movement.position,
      playerYaw: this.player.cameraCtrl.getYaw(),
      teammatePositions,
      spottedEnemies
    };
  }

  isMatchActive(): boolean {
    return this.matchActive;
  }

  isPaused(): boolean {
    return this.paused;
  }

  dispose(): void {
    this.loop.stop();
    this.input.dispose();
    this.sceneManager.dispose();
    this.eventBus.clear();
  }
}
