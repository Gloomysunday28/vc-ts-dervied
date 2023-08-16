import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

export default {
  getSrcDirname(pathName: string) {
    while (pathName && !pathName.endsWith("src")) {
      pathName = path.dirname(pathName);
    }

    return pathName;
  },
  getResolvePath(pathName: string) {
    let currentDirname = vscode.window.activeTextEditor.document.uri.fsPath;
    if (pathName.startsWith("@")) {
      currentDirname = path.resolve(
        this.getSrcDirname(currentDirname),
        "_tsdevried"
      );
      pathName = pathName.slice(pathName.startsWith("@/") ? 2 : 1);
    }
    const transformPath = path.resolve(path.dirname(currentDirname), pathName);
    return this.getPathisDir(transformPath) ? path.resolve(transformPath, 'index.ts') : transformPath + '.ts';
  },
  getPathisDir(pathName: string) {
    try {
      const stat = fs.lstatSync(pathName);
      return stat.isDirectory();
    } catch(err) {
    }

    return false;
  },
  getFsContent(filePath: string) {
    const content = fs.readFileSync(filePath, { encoding: "utf-8" });
    return content;
  },
};
