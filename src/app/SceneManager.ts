import * as THREE from 'three';
import { GraphicsSettings } from '../settings/GraphicsSettings.ts';

/**
 * Manages the Three.js Scene, PerspectiveCamera, WebGLRenderer, resize listener,
 * and graphics quality settings application.
 */
export class SceneManager {
  readonly scene: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly worldGroup: THREE.Group;
  readonly dynamicGroup: THREE.Group;
  readonly effectsGroup: THREE.Group;

  private readonly onResizeBound: () => void;
  private renderScale = 1.0;
  private maxPixelRatio = 1.5;

  constructor(canvas?: HTMLCanvasElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7fa4c4);
    this.scene.fog = new THREE.FogExp2(0x88abc8, 0.0065);

    const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const h = typeof window !== 'undefined' ? window.innerHeight : 720;

    this.camera = new THREE.PerspectiveCamera(80, w / Math.max(1, h), 0.1, 240);
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.worldGroup = new THREE.Group();
    this.worldGroup.name = 'WorldGeometry';
    this.dynamicGroup = new THREE.Group();
    this.dynamicGroup.name = 'DynamicActors';
    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = 'VisualEffects';

    this.scene.add(this.worldGroup);
    this.scene.add(this.dynamicGroup);
    this.scene.add(this.effectsGroup);

    this.onResizeBound = this.handleResize.bind(this);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResizeBound);
    }
    this.handleResize();
  }

  applyGraphicsSettings(settings: GraphicsSettings): void {
    this.renderScale = settings.renderScale;
    this.maxPixelRatio = settings.maxPixelRatio;
    this.renderer.shadowMap.enabled = settings.shadowQuality !== 'off';
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.density = 0.0065 * settings.fogDensityMultiplier;
    }
    this.handleResize();
  }

  handleResize(): void {
    const w = typeof window !== 'undefined' ? Math.max(320, window.innerWidth) : 1280;
    const h = typeof window !== 'undefined' ? Math.max(240, window.innerHeight) : 720;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const effectivePixelRatio = Math.min(dpr, this.maxPixelRatio) * this.renderScale;

    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(effectivePixelRatio);
    this.renderer.setSize(w, h, true);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResizeBound);
    }
    this.renderer.dispose();
  }
}
