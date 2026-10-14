export type GraphicsPreset = 'low' | 'medium' | 'high' | 'ultra';

export interface GraphicsSettings {
  preset: GraphicsPreset;
  shadowQuality: 'off' | 'low' | 'medium' | 'high';
  renderScale: number; // 0.5 to 1.5
  maxPixelRatio: number; // 1.0 to 2.0
  particlesEnabled: boolean;
  decalsEnabled: boolean;
  shellCasingsEnabled: boolean;
  fogDensityMultiplier: number;
}

export const GRAPHICS_PRESETS: Record<GraphicsPreset, GraphicsSettings> = {
  low: {
    preset: 'low',
    shadowQuality: 'off',
    renderScale: 0.75,
    maxPixelRatio: 1.0,
    particlesEnabled: false,
    decalsEnabled: false,
    shellCasingsEnabled: false,
    fogDensityMultiplier: 1.2
  },
  medium: {
    preset: 'medium',
    shadowQuality: 'low',
    renderScale: 0.9,
    maxPixelRatio: 1.25,
    particlesEnabled: true,
    decalsEnabled: true,
    shellCasingsEnabled: false,
    fogDensityMultiplier: 1.0
  },
  high: {
    preset: 'high',
    shadowQuality: 'high',
    renderScale: 1.0,
    maxPixelRatio: 1.5,
    particlesEnabled: true,
    decalsEnabled: true,
    shellCasingsEnabled: true,
    fogDensityMultiplier: 1.0
  },
  ultra: {
    preset: 'ultra',
    shadowQuality: 'high',
    renderScale: 1.0,
    maxPixelRatio: 2.0,
    particlesEnabled: true,
    decalsEnabled: true,
    shellCasingsEnabled: true,
    fogDensityMultiplier: 0.9
  }
};
