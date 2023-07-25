import type { BulletDto } from "../interface/vscode";
import * as vscode from "vscode";

class Bullet {
  lineCount = 0;
  bullet: BulletDto[] = [];
  addBullet(bullet: BulletDto) {
    const value = bullet.content.value;
    if (this.lineCount) {
      bullet.position = new vscode.Position(
        bullet.position.line + this.lineCount,
        bullet.position.character
      );
    }
    const count = value?.match(/(\n)/g)?.length;
    if (count) {
      this.lineCount += count;
    }
    this.bullet.push(bullet);
  }
  clearBullet() {
    this.bullet.length = 0;
  }
}

export default new Bullet();
