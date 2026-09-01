import Phaser from 'phaser';
import { BootScene } from './game/scenes/BootScene';
import { CombatScene } from './game/scenes/CombatScene';

new Phaser.Game({
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
  scene: [BootScene, CombatScene],
});
