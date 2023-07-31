import type { BulletDto } from "../../interface/vscode";
import type { TextEditorDecorationType } from "vscode";
import * as vscode from "vscode";
import format from "./format";
import strUtils from '../../utils/helpers/string';
import author from "../template/author";

class Bullet {
  lineCount = 0;
  decorateBullet: BulletDto[] = [];
  annotationDecoration: TextEditorDecorationType = vscode.window.createTextEditorDecorationType({
    after: {
      color: "#69676c",
      textDecoration: "none",
    },
    isWholeLine: true,
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedOpen,
  });
  clearDecorateBullet(): void;
  clearDecorateBullet() {
    if (this.decorateBullet.length) {
      this.renderTextDocument('clear');
      this.decorateBullet.length = 0;
    }
  }
  /**
   * @description 判断是否需要生成interface，触发详细解释Tips
   * @param bullet BulletDto
   */
  generateInterface(bullet: BulletDto): BulletDto;
  generateInterface(bullet: BulletDto) {
    const { content } = bullet;
    const length = content?.match(/(\n)/g)?.length;
    if (length) {
      const genericName = `${strUtils.uppcase(bullet.name)}ReturnType`;
      bullet.hoverMessage = new vscode.MarkdownString(
        '类型详细情况如下 \n',
        true
      );
      bullet.hoverMessage.supportHtml = true;
      bullet.hoverMessage.isTrusted = true;
      bullet.hoverMessage.appendCodeblock(
        format.formatCode(content.slice(2), {
          prefix: `interface ${genericName} ${strUtils.filterStr(bullet.type, '{', '', '\n')}`,
          reg: /\n/g,
          replacePrefix: '\n',
          format: "\t".repeat(bullet.type === 'TSTypeLiteral' ? 0 : 1),
          postfix: `\n${strUtils.filterStr(bullet.type, `}`)}${author}`,
        })
      );
      bullet.content = strUtils.padStart(genericName, ': ');
    }

    bullet.content = strUtils.padEnd(bullet.content, ' ');
    return bullet;
  }
  /**
   * @description 添加渲染原子到篮子里
   * @param decorateBullet BulletDto
   * @returns void
   */
  addDecorateBullet(decorateBullet: BulletDto): void;
  addDecorateBullet(decorateBullet) {
    const bullet = this.generateInterface(decorateBullet);
    if (!this.decorateBullet.includes(bullet)) {
      this.decorateBullet.push(bullet);
    }
  }
  /**
   * @description 渲染TypeReference到对应位置
   * @param auditor TextEditor
   * @returns void
   */
  renderTextDocument(type?: 'clear'): void;
  renderTextDocument(type) {
    const isClear = type === 'clear';
    const auditor = vscode.window.activeTextEditor;

    const range = isClear ? [] : this.decorateBullet.map((bullet) => ({
      renderOptions: {
        after: {
          contentText: bullet.content,
        },
      },
      range: auditor.document.validateRange(
        new vscode.Range(
          bullet.position,
          bullet.position
        )
      ),
      hoverMessage: bullet.hoverMessage,
    }));

    auditor.setDecorations(this.annotationDecoration, range);
  }
}

export default new Bullet();
