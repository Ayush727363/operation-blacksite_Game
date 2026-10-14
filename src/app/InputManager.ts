import { KeyBindingMap, DEFAULT_KEY_BINDINGS } from '../settings/KeyBindings.ts';

/**
 * Manages keyboard, mouse button, mouse delta, scroll wheel, pointer lock,
 * and window focus/blur events with clean listener disposal.
 */
export class InputManager {
  private keysDown = new Set<string>();
  private keysJustPressed = new Set<string>();
  private mouseButtonsDown = new Set<number>();
  private mouseButtonsJustPressed = new Set<number>();
  private mouseDeltaX = 0;
  private mouseDeltaY = 0;
  private wheelDelta = 0;
  private pointerLocked = false;
  private enabled = true;
  private bindings: KeyBindingMap = { ...DEFAULT_KEY_BINDINGS };
  private targetElement: HTMLElement | null = null;
  private pointerLockChangeCallbacks = new Set<(locked: boolean) => void>();

  private readonly onKeyDownBound: (e: KeyboardEvent) => void;
  private readonly onKeyUpBound: (e: KeyboardEvent) => void;
  private readonly onMouseDownBound: (e: MouseEvent) => void;
  private readonly onMouseUpBound: (e: MouseEvent) => void;
  private readonly onMouseMoveBound: (e: MouseEvent) => void;
  private readonly onWheelBound: (e: WheelEvent) => void;
  private readonly onPointerLockChangeBound: () => void;
  private readonly onBlurBound: () => void;
  private readonly onContextMenuBound: (e: Event) => void;

  constructor(targetElement: HTMLElement | null = null) {
    this.targetElement = targetElement;
    this.onKeyDownBound = this.onKeyDown.bind(this);
    this.onKeyUpBound = this.onKeyUp.bind(this);
    this.onMouseDownBound = this.onMouseDown.bind(this);
    this.onMouseUpBound = this.onMouseUp.bind(this);
    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onWheelBound = this.onWheel.bind(this);
    this.onPointerLockChangeBound = this.onPointerLockChange.bind(this);
    this.onBlurBound = this.onBlur.bind(this);
    this.onContextMenuBound = (e: Event) => e.preventDefault();

    this.attachListeners();
  }

  private attachListeners(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('mousedown', this.onMouseDownBound);
    window.addEventListener('mouseup', this.onMouseUpBound);
    window.addEventListener('mousemove', this.onMouseMoveBound);
    window.addEventListener('wheel', this.onWheelBound, { passive: true });
    window.addEventListener('blur', this.onBlurBound);
    if (typeof document !== 'undefined') {
      document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);
      document.addEventListener('contextmenu', this.onContextMenuBound);
    }
  }

  dispose(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('mousedown', this.onMouseDownBound);
    window.removeEventListener('mouseup', this.onMouseUpBound);
    window.removeEventListener('mousemove', this.onMouseMoveBound);
    window.removeEventListener('wheel', this.onWheelBound);
    window.removeEventListener('blur', this.onBlurBound);
    if (typeof document !== 'undefined') {
      document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);
      document.removeEventListener('contextmenu', this.onContextMenuBound);
    }
    this.clearState();
  }

  setBindings(bindings: KeyBindingMap): void {
    this.bindings = { ...bindings };
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearState();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  requestPointerLock(): void {
    if (!this.targetElement || typeof this.targetElement.requestPointerLock !== 'function') {
      this.pointerLocked = true;
      return;
    }
    try {
      const p = this.targetElement.requestPointerLock() as unknown as Promise<void>;
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // Headless automation fallback
        });
      }
    } catch {
      // Ignore pointer lock rejection in automated browsers
    }
  }

  exitPointerLock(): void {
    if (typeof document !== 'undefined' && document.pointerLockElement && typeof document.exitPointerLock === 'function') {
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    this.pointerLocked = false;
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  setSimulatedPointerLock(locked: boolean): void {
    this.pointerLocked = locked;
  }

  onPointerLockChangeCallback(cb: (locked: boolean) => void): () => void {
    this.pointerLockChangeCallbacks.add(cb);
    return () => this.pointerLockChangeCallbacks.delete(cb);
  }

  isActionActive(action: keyof KeyBindingMap): boolean {
    if (!this.enabled) return false;
    const code = this.bindings[action];
    return this.keysDown.has(code);
  }

  wasActionJustPressed(action: keyof KeyBindingMap): boolean {
    if (!this.enabled) return false;
    const code = this.bindings[action];
    return this.keysJustPressed.has(code);
  }

  isKeyDown(code: string): boolean {
    return this.enabled && this.keysDown.has(code);
  }

  wasKeyJustPressed(code: string): boolean {
    return this.enabled && this.keysJustPressed.has(code);
  }

  isMouseButtonDown(button: number): boolean {
    return this.enabled && this.mouseButtonsDown.has(button);
  }

  wasMouseButtonJustPressed(button: number): boolean {
    return this.enabled && this.mouseButtonsJustPressed.has(button);
  }

  consumeMouseDelta(): { dx: number; dy: number } {
    if (!this.enabled) {
      this.mouseDeltaX = 0;
      this.mouseDeltaY = 0;
      return { dx: 0, dy: 0 };
    }
    const dx = this.mouseDeltaX;
    const dy = this.mouseDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    return { dx, dy };
  }

  consumeWheelDelta(): number {
    if (!this.enabled) {
      this.wheelDelta = 0;
      return 0;
    }
    const w = this.wheelDelta;
    this.wheelDelta = 0;
    return w;
  }

  endFrame(): void {
    this.keysJustPressed.clear();
    this.mouseButtonsJustPressed.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.wheelDelta = 0;
  }

  clearState(): void {
    this.keysDown.clear();
    this.keysJustPressed.clear();
    this.mouseButtonsDown.clear();
    this.mouseButtonsJustPressed.clear();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.wheelDelta = 0;
  }

  // Programmatic injection methods for integration & browser tests
  simulateKeyDown(code: string): void {
    if (!this.keysDown.has(code)) {
      this.keysJustPressed.add(code);
    }
    this.keysDown.add(code);
  }

  simulateKeyUp(code: string): void {
    this.keysDown.delete(code);
  }

  simulateMouseButton(button: number, down: boolean): void {
    if (down) {
      if (!this.mouseButtonsDown.has(button)) {
        this.mouseButtonsJustPressed.add(button);
      }
      this.mouseButtonsDown.add(button);
    } else {
      this.mouseButtonsDown.delete(button);
    }
  }

  simulateMouseMove(dx: number, dy: number): void {
    this.mouseDeltaX += dx;
    this.mouseDeltaY += dy;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Tab' || e.code === 'Space' || e.code === 'F3') {
      e.preventDefault();
    }
    if (!this.keysDown.has(e.code)) {
      this.keysJustPressed.add(e.code);
    }
    this.keysDown.add(e.code);
  }

  private onKeyUp(e: KeyboardEvent): void {
    this.keysDown.delete(e.code);
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.targetElement && e.target !== this.targetElement) return;
    if (!this.mouseButtonsDown.has(e.button)) {
      this.mouseButtonsJustPressed.add(e.button);
    }
    this.mouseButtonsDown.add(e.button);
  }

  private onMouseUp(e: MouseEvent): void {
    this.mouseButtonsDown.delete(e.button);
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.pointerLocked) return;
    const mx = e.movementX || 0;
    const my = e.movementY || 0;
    // Clamp extreme browser mouse-jump spikes
    if (Math.abs(mx) < 600 && Math.abs(my) < 600) {
      this.mouseDeltaX += mx;
      this.mouseDeltaY += my;
    }
  }

  private onWheel(e: WheelEvent): void {
    if (e.deltaY !== 0) {
      this.wheelDelta += Math.sign(e.deltaY);
    }
  }

  private onPointerLockChange(): void {
    if (typeof document === 'undefined') return;
    const locked = document.pointerLockElement === this.targetElement;
    this.pointerLocked = locked;
    if (!locked) {
      this.clearState();
    }
    for (const cb of this.pointerLockChangeCallbacks) {
      cb(locked);
    }
  }

  private onBlur(): void {
    this.clearState();
  }
}
