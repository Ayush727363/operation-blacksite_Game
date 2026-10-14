import { Game } from './app/Game.ts';

declare global {
  interface Window {
    __BLACKSITE_GAME__?: Game;
  }
}

function bootstrap(): void {
  if (typeof document === 'undefined') return;
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiLayer = document.getElementById('ui-layer') as HTMLElement | null;
  if (!canvas || !uiLayer) return;

  const game = new Game(canvas, uiLayer);
  game.loop.start();
  window.__BLACKSITE_GAME__ = game;
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
}
