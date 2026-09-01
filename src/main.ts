import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { CombatScene } from './game/scenes/CombatScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#0a0a0d',
  pixelArt: false,
  // RESIZE makes the canvas fill its parent exactly at the real viewport
  // aspect ratio, instead of FIT's letterboxing a fixed-aspect canvas —
  // the difference between the game covering the whole phone screen and
  // sitting in a thin strip with black bars. CombatScene listens for the
  // resize event to keep the camera/HUD in sync as that ratio changes
  // (rotation, or a mobile browser's address bar collapsing).
  scale: {
    mode: Phaser.Scale.RESIZE,
  },
  // Two simultaneous touches (move stick + aim stick) plus the mouse pointer slot.
  input: {
    activePointers: 3,
  },
  scene: [BootScene, CombatScene],
});

if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

// Mobile Safari/Chrome fire 'orientationchange' before window.innerWidth/
// innerHeight have actually settled on the new orientation's values — read
// them immediately and RESIZE mode's canvas ends up sized for the *old*
// orientation, which reads as the game being cut off top/bottom (or left/
// right) after rotating. Re-measuring a few times over the following
// half-second, rather than trusting the first post-event reading, is the
// standard workaround for that race.
window.addEventListener('orientationchange', () => {
  for (const delay of [0, 100, 300, 600]) {
    setTimeout(() => game.scale.resize(window.innerWidth, window.innerHeight), delay);
  }
});

