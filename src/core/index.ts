import * as vscode from 'vscode';
import utils from "../utils";
import config from './config';
import initGlobalThis from '../utils/helpers/initGlobalThis'
import type { Disposable } from 'vscode';

globalThis.loopPathLimit = 5;
export default class CoreTypeAst {
  EventListenersMap: Disposable[] = [];
  fileExt = ['ts', 'tsx', 'vue', 'js'];
  fileToTransform(file) {
    return this.fileExt.some(ext => utils.isPadEndString(file, ext));
  }
  transformAST = (textEditor) => {
    if (this.fileToTransform(textEditor?.uri?._fsPath || '')) {
      utils.transformAST();
    }
  };
  transformASTActiveEditor = utils.debounce((textEditor) => {
    if (this.fileToTransform(textEditor?.document?.uri?._fsPath || '')) {
      utils.transformAST();
    }
  }, 1000);
  install() {
    initGlobalThis();
    this.EventListenersMap.push(vscode.workspace.onDidChangeTextDocument(this.transformASTActiveEditor), vscode.workspace.onDidOpenTextDocument(this.transformAST), vscode.window.onDidChangeActiveTextEditor((...args) => {
      initGlobalThis();
      this.transformASTActiveEditor(...args);
    }), config.installConfiguration());
  }
  deactivate() {
    let task: Disposable;
    while(task = this.EventListenersMap.shift()) {
      task?.dispose?.();
    }
  }
}