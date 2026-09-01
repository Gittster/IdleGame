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
