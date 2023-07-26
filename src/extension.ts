import * as vscode from "vscode";
import { parseAst } from "./utils/parse";
import { traverseAst } from "./utils/traverse";
import visitors from "./core/visitors";
import bullet from "./core/render/bullet";

export function activate(context: vscode.ExtensionContext) {
  const auditor = vscode.window.activeTextEditor;
  const code = auditor.document.getText();
  traverseAst(parseAst(code), visitors);
	bullet.renderTextDocument();
}

export function deactivate() {}
