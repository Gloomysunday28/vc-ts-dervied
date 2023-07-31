import * as vscode from "vscode";
import CoreTypeAst from './core';

const coreTypeAst = new CoreTypeAst();
coreTypeAst.install();
export function activate(context: vscode.ExtensionContext) {
  coreTypeAst.transformAST(vscode.window.activeTextEditor.document);
}

export function deactivate() {
  coreTypeAst.deactivate();
}
