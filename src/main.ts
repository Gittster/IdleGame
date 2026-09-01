import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { CombatScene } from './game/scenes/CombatScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'app',
  width: 1024,
  height: 768,
  backgroundColor: '#0a0a0d',
  pixelArt: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
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
