export interface KeyBindingMap {
  moveForward: string;
  moveBackward: string;
  moveLeft: string;
  moveRight: string;
  jump: string;
  sprint: string;
  crouch: string;
  crouchAlt: string;
  reload: string;
  interact: string;
  buyMenu: string;
  throwGrenade: string;
  cycleGrenade: string;
  slot1: string;
  slot2: string;
  slot3: string;
  slot4: string;
  slot5: string;
  scoreboard: string;
  pause: string;
  debugOverlay: string;
}

export const DEFAULT_KEY_BINDINGS: KeyBindingMap = {
  moveForward: 'KeyW',
  moveBackward: 'KeyS',
  moveLeft: 'KeyA',
  moveRight: 'KeyD',
  jump: 'Space',
  sprint: 'ShiftLeft',
  crouch: 'ControlLeft',
  crouchAlt: 'KeyC',
  reload: 'KeyR',
  interact: 'KeyE',
  buyMenu: 'KeyB',
  throwGrenade: 'KeyG',
  cycleGrenade: 'KeyQ',
  slot1: 'Digit1',
  slot2: 'Digit2',
  slot3: 'Digit3',
  slot4: 'Digit4',
  slot5: 'Digit5',
  scoreboard: 'Tab',
  pause: 'Escape',
  debugOverlay: 'F3'
};
