import generic from "../../utils/helpers/generic";
import bullet from "./bullet";
import * as vscode from "vscode";

export default {
  getUnkonwnTSType(path, async, unknownMark = '?') {
    const { node } = path;
    const { id } = node;
    bullet.addDecorateBullet({
      content: async ? `: Promise<${unknownMark}>` : `: ${unknownMark}`,
      type: "?",
      name: generic.AsyncGeneric(
        id?.name || path?.parent?.id?.name || "Anonymous",
        async
      ),
      position: new vscode.Position(
        node.body.loc.start.line - 1,
        node.body.loc.start.column
      ),
    });
  }
}