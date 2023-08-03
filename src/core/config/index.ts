import * as vscode from 'vscode';
import * as t from '@babel/types';
import utils from "../../utils";

export default {
  withBlackFns: '',
  getConfiguration() {
    return vscode.workspace.getConfiguration('TypescriptAutoDervie');
  },
  changeConfiguration(event) {
    if (event.affectsConfiguration('TypescriptAutoDervie.withBlackFns.names')) {
      this.withBlackFns = (this.getConfiguration().get('withBlackFns.names') || '').split(',');
      utils.transformAST();
    }
  },
  installConfiguration() {
    this.withBlackFns = (this.getConfiguration().get('withBlackFns.names') || '').split(',');
    return vscode.workspace.onDidChangeConfiguration(this.changeConfiguration);
  },
  /** 是否是黑名单 */
  isBlacklisted(path: Record<string, any>) {
    switch (true) {
      case path.key === 'init':
        return this.withBlackFns.includes(path.parent?.id?.name);
      case path.listKey === 'arguments' && t.isCallExpression(path.parent):
        return this.withBlackFns.includes(path.parent.callee?.name);
      case path.listKey === 'properties':
        return this.withBlackFns.includes(path.node.key?.name);
      case path.node.id:
        return this.withBlackFns.includes(path.identifier.name);
      default:
        return false;
    }
  }
};