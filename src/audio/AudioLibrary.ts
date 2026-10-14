/**
 * Procedural acoustic synthesis profile definitions for weapons, footsteps,
 * impacts, explosions, objectives, and UI feedback.
 */
export interface SoundSynthesisRecipe {
  id: string;
  baseFreqHz: number;
  endFreqHz: number;
  durationSec: number;
  noiseMix: number;
  gain: number;
  filterType: BiquadFilterType;
  filterFreqHz: number;
}

export const AUDIO_LIBRARY: Record<string, SoundSynthesisRecipe> = {
  shot_rifle: {
    id: 'shot_rifle',
    baseFreqHz: 155,
    endFreqHz: 42,
    durationSec: 0.18,
    noiseMix: 0.78,
    gain: 0.55,
    filterType: 'lowpass',
    filterFreqHz: 1850
  },
  shot_smg: {
    id: 'shot_smg',
    baseFreqHz: 230,
    endFreqHz: 68,
    durationSec: 0.12,
    noiseMix: 0.68,
    gain: 0.42,
    filterType: 'bandpass',
    filterFreqHz: 2100
  },
  shot_shotgun: {
    id: 'shot_shotgun',
    baseFreqHz: 95,
    endFreqHz: 28,
    durationSec: 0.28,
    noiseMix: 0.88,
    gain: 0.68,
    filterType: 'lowpass',
    filterFreqHz: 1200
  },
  shot_sniper: {
    id: 'shot_sniper',
    baseFreqHz: 80,
    endFreqHz: 22,
    durationSec: 0.38,
    noiseMix: 0.85,
    gain: 0.75,
    filterType: 'lowpass',
    filterFreqHz: 1500
  },
  shot_pistol: {
    id: 'shot_pistol',
    baseFreqHz: 210,
    endFreqHz: 65,
    durationSec: 0.13,
    noiseMix: 0.65,
    gain: 0.44,
    filterType: 'bandpass',
    filterFreqHz: 2200
  },
  melee_slash: {
    id: 'melee_slash',
    baseFreqHz: 480,
    endFreqHz: 140,
    durationSec: 0.09,
    noiseMix: 0.8,
    gain: 0.3,
    filterType: 'highpass',
    filterFreqHz: 900
  },
  reload_click: {
    id: 'reload_click',
    baseFreqHz: 640,
    endFreqHz: 320,
    durationSec: 0.08,
    noiseMix: 0.35,
    gain: 0.28,
    filterType: 'bandpass',
    filterFreqHz: 1800
  },
  dry_fire: {
    id: 'dry_fire',
    baseFreqHz: 880,
    endFreqHz: 440,
    durationSec: 0.04,
    noiseMix: 0.2,
    gain: 0.22,
    filterType: 'highpass',
    filterFreqHz: 1500
  },
  weapon_switch: {
    id: 'weapon_switch',
    baseFreqHz: 340,
    endFreqHz: 520,
    durationSec: 0.07,
    noiseMix: 0.4,
    gain: 0.2,
    filterType: 'bandpass',
    filterFreqHz: 1400
  },
  impact_concrete: {
    id: 'impact_concrete',
    baseFreqHz: 320,
    endFreqHz: 90,
    durationSec: 0.07,
    noiseMix: 0.75,
    gain: 0.32,
    filterType: 'bandpass',
    filterFreqHz: 1300
  },
  impact_metal: {
    id: 'impact_metal',
    baseFreqHz: 980,
    endFreqHz: 420,
    durationSec: 0.11,
    noiseMix: 0.3,
    gain: 0.36,
    filterType: 'highpass',
    filterFreqHz: 1600
  },
  hit_marker: {
    id: 'hit_marker',
    baseFreqHz: 1250,
    endFreqHz: 850,
    durationSec: 0.045,
    noiseMix: 0.15,
    gain: 0.3,
    filterType: 'highpass',
    filterFreqHz: 1000
  },
  headshot_ding: {
    id: 'headshot_ding',
    baseFreqHz: 1920,
    endFreqHz: 1480,
    durationSec: 0.12,
    noiseMix: 0.05,
    gain: 0.42,
    filterType: 'bandpass',
    filterFreqHz: 1800
  },
  explosion_frag: {
    id: 'explosion_frag',
    baseFreqHz: 72,
    endFreqHz: 18,
    durationSec: 0.65,
    noiseMix: 0.92,
    gain: 0.85,
    filterType: 'lowpass',
    filterFreqHz: 650
  },
  smoke_deploy: {
    id: 'smoke_deploy',
    baseFreqHz: 400,
    endFreqHz: 280,
    durationSec: 0.55,
    noiseMix: 0.98,
    gain: 0.45,
    filterType: 'bandpass',
    filterFreqHz: 1100
  },
  footstep_concrete: {
    id: 'footstep_concrete',
    baseFreqHz: 140,
    endFreqHz: 60,
    durationSec: 0.06,
    noiseMix: 0.7,
    gain: 0.22,
    filterType: 'lowpass',
    filterFreqHz: 750
  },
  footstep_metal: {
    id: 'footstep_metal',
    baseFreqHz: 380,
    endFreqHz: 150,
    durationSec: 0.07,
    noiseMix: 0.5,
    gain: 0.26,
    filterType: 'bandpass',
    filterFreqHz: 1400
  },
  footstep_wood: {
    id: 'footstep_wood',
    baseFreqHz: 190,
    endFreqHz: 80,
    durationSec: 0.065,
    noiseMix: 0.6,
    gain: 0.24,
    filterType: 'lowpass',
    filterFreqHz: 900
  },
  bomb_beep: {
    id: 'bomb_beep',
    baseFreqHz: 2450,
    endFreqHz: 2450,
    durationSec: 0.06,
    noiseMix: 0.0,
    gain: 0.35,
    filterType: 'bandpass',
    filterFreqHz: 2450
  },
  ui_click: {
    id: 'ui_click',
    baseFreqHz: 760,
    endFreqHz: 980,
    durationSec: 0.035,
    noiseMix: 0.05,
    gain: 0.2,
    filterType: 'highpass',
    filterFreqHz: 600
  }
};
