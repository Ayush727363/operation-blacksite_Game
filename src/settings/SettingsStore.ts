import { DEFAULT_KEY_BINDINGS, KeyBindingMap } from './KeyBindings.ts';
import { GRAPHICS_PRESETS, GraphicsPreset, GraphicsSettings } from './GraphicsSettings.ts';
import { GameModeType } from '../app/GameConfig.ts';

export interface UserSettings {
  mouseSensitivityX: number;
  mouseSensitivityY: number;
  fov: number;
  masterVolume: number;
  sfxVolume: number;
  musicVolume: number;
  muted: boolean;
  difficulty: number;
  preferredMode: GameModeType;
  preferredBotCount: number;
  graphics: GraphicsSettings;
  keyBindings: KeyBindingMap;
}

const STORAGE_KEY = 'operation_blacksite_settings_v1';

export const DEFAULT_USER_SETTINGS: UserSettings = {
  mouseSensitivityX: 1.0,
  mouseSensitivityY: 1.0,
  fov: 80,
  masterVolume: 0.8,
  sfxVolume: 0.85,
  musicVolume: 0.45,
  muted: false,
  difficulty: 5,
  preferredMode: 'bomb_defusal',
  preferredBotCount: 7,
  graphics: { ...GRAPHICS_PRESETS.high },
  keyBindings: { ...DEFAULT_KEY_BINDINGS }
};

function clampNum(val: unknown, min: number, max: number, fallback: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

export class SettingsStore {
  private settings: UserSettings;
  private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  private listeners = new Set<(s: UserSettings) => void>();

  constructor(customStorage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null) {
    if (customStorage !== undefined) {
      this.storage = customStorage;
    } else {
      try {
        this.storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
      } catch {
        this.storage = null;
      }
    }
    this.settings = this.load();
  }

  private sanitize(raw: any): UserSettings {
    if (!raw || typeof raw !== 'object') {
      return structuredCloneSettings(DEFAULT_USER_SETTINGS);
    }

    const validModes: GameModeType[] = ['bomb_defusal', 'team_deathmatch', 'ffa_deathmatch'];
    const mode: GameModeType = validModes.includes(raw.preferredMode)
      ? raw.preferredMode
      : DEFAULT_USER_SETTINGS.preferredMode;

    const validPresets: GraphicsPreset[] = ['low', 'medium', 'high', 'ultra'];
    const preset: GraphicsPreset = validPresets.includes(raw.graphics?.preset)
      ? raw.graphics.preset
      : 'high';
    const baseGraphics = GRAPHICS_PRESETS[preset];

    const sanitizedBindings: KeyBindingMap = { ...DEFAULT_KEY_BINDINGS };
    if (raw.keyBindings && typeof raw.keyBindings === 'object') {
      for (const k of Object.keys(DEFAULT_KEY_BINDINGS) as Array<keyof KeyBindingMap>) {
        const v = raw.keyBindings[k];
        if (typeof v === 'string' && v.trim().length > 0 && v.length <= 24) {
          sanitizedBindings[k] = v.trim();
        }
      }
    }

    return {
      mouseSensitivityX: clampNum(raw.mouseSensitivityX, 0.1, 5.0, DEFAULT_USER_SETTINGS.mouseSensitivityX),
      mouseSensitivityY: clampNum(raw.mouseSensitivityY, 0.1, 5.0, DEFAULT_USER_SETTINGS.mouseSensitivityY),
      fov: clampNum(raw.fov, 60, 110, DEFAULT_USER_SETTINGS.fov),
      masterVolume: clampNum(raw.masterVolume, 0.0, 1.0, DEFAULT_USER_SETTINGS.masterVolume),
      sfxVolume: clampNum(raw.sfxVolume, 0.0, 1.0, DEFAULT_USER_SETTINGS.sfxVolume),
      musicVolume: clampNum(raw.musicVolume, 0.0, 1.0, DEFAULT_USER_SETTINGS.musicVolume),
      muted: typeof raw.muted === 'boolean' ? raw.muted : DEFAULT_USER_SETTINGS.muted,
      difficulty: Math.round(clampNum(raw.difficulty, 1, 10, DEFAULT_USER_SETTINGS.difficulty)),
      preferredMode: mode,
      preferredBotCount: Math.round(clampNum(raw.preferredBotCount, 1, 12, DEFAULT_USER_SETTINGS.preferredBotCount)),
      graphics: {
        preset,
        shadowQuality: ['off', 'low', 'medium', 'high'].includes(raw.graphics?.shadowQuality)
          ? raw.graphics.shadowQuality
          : baseGraphics.shadowQuality,
        renderScale: clampNum(raw.graphics?.renderScale, 0.5, 1.5, baseGraphics.renderScale),
        maxPixelRatio: clampNum(raw.graphics?.maxPixelRatio, 1.0, 2.0, baseGraphics.maxPixelRatio),
        particlesEnabled: typeof raw.graphics?.particlesEnabled === 'boolean'
          ? raw.graphics.particlesEnabled
          : baseGraphics.particlesEnabled,
        decalsEnabled: typeof raw.graphics?.decalsEnabled === 'boolean'
          ? raw.graphics.decalsEnabled
          : baseGraphics.decalsEnabled,
        shellCasingsEnabled: typeof raw.graphics?.shellCasingsEnabled === 'boolean'
          ? raw.graphics.shellCasingsEnabled
          : baseGraphics.shellCasingsEnabled,
        fogDensityMultiplier: clampNum(raw.graphics?.fogDensityMultiplier, 0.5, 2.0, baseGraphics.fogDensityMultiplier)
      },
      keyBindings: sanitizedBindings
    };
  }

  load(): UserSettings {
    if (!this.storage) {
      return structuredCloneSettings(DEFAULT_USER_SETTINGS);
    }
    try {
      const rawStr = this.storage.getItem(STORAGE_KEY);
      if (!rawStr) {
        return structuredCloneSettings(DEFAULT_USER_SETTINGS);
      }
      const parsed = JSON.parse(rawStr);
      this.settings = this.sanitize(parsed);
      return structuredCloneSettings(this.settings);
    } catch {
      this.settings = structuredCloneSettings(DEFAULT_USER_SETTINGS);
      return structuredCloneSettings(this.settings);
    }
  }

  get(): UserSettings {
    return structuredCloneSettings(this.settings);
  }

  update(partial: Partial<UserSettings>): UserSettings {
    const merged = {
      ...this.settings,
      ...partial,
      graphics: {
        ...this.settings.graphics,
        ...(partial.graphics ?? {})
      },
      keyBindings: {
        ...this.settings.keyBindings,
        ...(partial.keyBindings ?? {})
      }
    };
    this.settings = this.sanitize(merged);
    this.save();
    for (const cb of this.listeners) {
      cb(this.get());
    }
    return this.get();
  }

  applyGraphicsPreset(preset: GraphicsPreset): UserSettings {
    return this.update({
      graphics: { ...GRAPHICS_PRESETS[preset] }
    });
  }

  reset(): UserSettings {
    this.settings = structuredCloneSettings(DEFAULT_USER_SETTINGS);
    if (this.storage) {
      try {
        this.storage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore storage error
      }
    }
    this.save();
    for (const cb of this.listeners) {
      cb(this.get());
    }
    return this.get();
  }

  save(): void {
    if (!this.storage) return;
    try {
      this.storage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore quota errors
    }
  }

  onChange(listener: (s: UserSettings) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

function structuredCloneSettings(s: UserSettings): UserSettings {
  return {
    ...s,
    graphics: { ...s.graphics },
    keyBindings: { ...s.keyBindings }
  };
}
