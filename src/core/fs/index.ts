import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'

export default {
  getResolvePath(pathName: string) {
    const currentDirname = vscode.window.activeTextEditor.document.uri.fsPath
    return path.resolve(path.dirname(currentDirname), pathName + '.ts')
  },
  getFsContent(filePath: string) {
    const content = fs.readFileSync(filePath, { encoding: 'utf-8' })
    return content
  }
}