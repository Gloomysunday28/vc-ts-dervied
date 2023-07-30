import * as vscode from "vscode";
import { parseAst } from "./utils/parse";
import { traverseAst } from "./utils/traverse";
import visitors from "./core/visitors";
import bullet from "./core/render/bullet";
import initGlobalThis from './utils/helpers/initGlobalThis'

globalThis.loopPathLimit = 15
export function activate(context: vscode.ExtensionContext) {
  const auditor = vscode.window.activeTextEditor;
  const code = auditor.document.getText();
  traverseAst(parseAst(code), visitors);
	bullet.renderTextDocument();
  initGlobalThis()
}

export function deactivate() {}
