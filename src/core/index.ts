import * as vscode from 'vscode';
import utils from "../utils";
import type { Disposable } from 'vscode';

globalThis.loopPathLimit = 15;
export default class CoreTypeAst {
  EventListenersMap: Disposable[] = [];
  transformAST = (textEditor) => {
    if (utils.isPadEndString(textEditor?.uri?._fsPath || '', '.ts')) {
      utils.transformAST();
    }
  };
  transformASTActiveEditor = utils.debounce((textEditor) => {
    if (utils.isPadEndString(textEditor?.document?.uri?._fsPath || '', '.ts')) {
      utils.transformAST();
    }
  }, 300);
  install() {
    this.EventListenersMap.push(vscode.workspace.onDidChangeTextDocument(this.transformASTActiveEditor), vscode.workspace.onDidOpenTextDocument(this.transformAST), vscode.window.onDidChangeActiveTextEditor(this.transformASTActiveEditor));
  }
  deactivate() {
    let task: Disposable;
    while(task = this.EventListenersMap.shift()) {
      task?.dispose?.();
    }
  }
}