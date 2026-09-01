import Phaser from 'phaser';
import { sceneBridge } from '../state/sceneBridge';

/**
 * A deliberately passive scene: the actual interactive town UI (gold,
 * inventory, zone selection) is the React overlay in src/ui, mounted over
 * the canvas. This scene just provides the backdrop and hands scene
 * control to that overlay via sceneBridge.
 */
export class TownScene extends Phaser.Scene {
  private title!: Phaser.GameObjects.Text;

  constructor() {
    super('Town');
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1c1a16');
    this.title = this.add
      .text(this.scale.width / 2, 48, 'The Town', { fontFamily: 'Cinzel, serif', fontSize: '28px', color: '#e8d9a8' })
      .setOrigin(0.5);

    sceneBridge.setScreen('town');
    sceneBridge.setEnterZoneHandler((zoneId) => this.scene.start('Combat', { zoneId }));

    this.scale.on('resize', () => this.title.setX(this.scale.width / 2));
  }
}
