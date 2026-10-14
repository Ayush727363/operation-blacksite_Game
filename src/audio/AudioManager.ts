import * as THREE from 'three';
import { AUDIO_LIBRARY, SoundSynthesisRecipe } from './AudioLibrary.ts';
import { SpatialAudioCalculator } from './SpatialAudio.ts';
import { WeaponDefinition } from '../weapons/WeaponDefinitions.ts';

/**
 * Web Audio API procedural sound synthesizer and 3D spatial audio manager.
 * Handles browser gesture activation safely and respects master/sfx/mute settings.
 */
export class AudioManager {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterVolume = 0.8;
  private sfxVolume = 0.85;
  private musicVolume = 0.45;
  private muted = false;
  private listenerPos = new THREE.Vector3();
  private listenerForward = new THREE.Vector3(0, 0, -1);
  private playedEventsCount = 0;

  unlockAudioContext(): void {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;

    if (!this.ctx) {
      try {
        this.ctx = new AudioCtx();
        this.createNoiseBuffer();
      } catch {
        this.ctx = null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private createNoiseBuffer(): void {
    if (!this.ctx) return;
    const sampleRate = this.ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.8);
    const buffer = this.ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
  }

  setVolumes(master: number, sfx: number, music: number, muted: boolean): void {
    this.masterVolume = THREE.MathUtils.clamp(master, 0, 1);
    this.sfxVolume = THREE.MathUtils.clamp(sfx, 0, 1);
    this.musicVolume = THREE.MathUtils.clamp(music, 0, 1);
    this.muted = muted;
  }

  getEffectiveSfxGain(): number {
    if (this.muted) return 0;
    return this.masterVolume * this.sfxVolume;
  }

  getPlayedEventsCount(): number {
    return this.playedEventsCount;
  }

  updateListener(position: THREE.Vector3, forward: THREE.Vector3): void {
    this.listenerPos.copy(position);
    this.listenerForward.copy(forward);
  }

  playWeaponFire(weapon: WeaponDefinition, worldOrigin?: THREE.Vector3): void {
    const categoryKey =
      weapon.category === 'melee'
        ? 'melee_slash'
        : `shot_${weapon.category}`;
    const baseRecipe = AUDIO_LIBRARY[categoryKey] || AUDIO_LIBRARY.shot_rifle;
    const customRecipe: SoundSynthesisRecipe = {
      ...baseRecipe,
      baseFreqHz: weapon.audioPitchHz,
      durationSec: weapon.audioDurationSec
    };
    this.playRecipe(customRecipe, worldOrigin, 80);
  }

  playFootstep(surface: 'concrete' | 'metal' | 'wood' | 'dirt', worldOrigin?: THREE.Vector3): void {
    const key =
      surface === 'metal'
        ? 'footstep_metal'
        : surface === 'wood'
          ? 'footstep_wood'
          : 'footstep_concrete';
    this.playRecipe(AUDIO_LIBRARY[key], worldOrigin, 32);
  }

  playSoundId(soundId: keyof typeof AUDIO_LIBRARY, worldOrigin?: THREE.Vector3, maxDist = 55): void {
    const recipe = AUDIO_LIBRARY[soundId];
    if (recipe) {
      this.playRecipe(recipe, worldOrigin, maxDist);
    }
  }

  private playRecipe(
    recipe: SoundSynthesisRecipe,
    worldOrigin?: THREE.Vector3,
    maxDistance = 65
  ): void {
    const baseGain = this.getEffectiveSfxGain();
    if (baseGain <= 0.001) return;

    let pan = 0;
    let spatialAttenuation = 1.0;
    if (worldOrigin) {
      const spatial = SpatialAudioCalculator.compute(
        this.listenerPos,
        this.listenerForward,
        worldOrigin,
        maxDistance
      );
      pan = spatial.pan;
      spatialAttenuation = spatial.gainMultiplier;
      if (spatialAttenuation <= 0.01) return;
    }

    this.playedEventsCount++;
    if (!this.ctx || this.ctx.state !== 'running') return;

    const now = this.ctx.currentTime;
    const finalGain = Math.min(1.0, recipe.gain * baseGain * spatialAttenuation);

    const gainNode = this.ctx.createGain();
    gainNode.gain.setValueAtTime(finalGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + recipe.durationSec);

    let destinationNode: AudioNode = this.ctx.destination;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(pan, now);
      panner.connect(this.ctx.destination);
      destinationNode = panner;
    }

    const filter = this.ctx.createBiquadFilter();
    filter.type = recipe.filterType;
    filter.frequency.setValueAtTime(recipe.filterFreqHz, now);
    filter.connect(gainNode);
    gainNode.connect(destinationNode);

    // Tonal body oscillator
    if (recipe.noiseMix < 0.95) {
      const osc = this.ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(recipe.baseFreqHz, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(15, recipe.endFreqHz), now + recipe.durationSec);
      osc.connect(filter);
      osc.start(now);
      osc.stop(now + recipe.durationSec);
    }

    // Transient noise burst
    if (recipe.noiseMix > 0.02 && this.noiseBuffer) {
      const noiseSrc = this.ctx.createBufferSource();
      noiseSrc.buffer = this.noiseBuffer;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(finalGain * recipe.noiseMix, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + recipe.durationSec);
      noiseSrc.connect(noiseGain);
      noiseGain.connect(filter);
      noiseSrc.start(now);
      noiseSrc.stop(now + recipe.durationSec);
    }
  }
}
