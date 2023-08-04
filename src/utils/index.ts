import * as vscode from "vscode";
import { parseAst } from "./parse";
import { traverseAst } from "./traverse";
import visitors from "../core/visitors";
import bullet from "../core/render/bullet";
import initGlobalThis from "./helpers/initGlobalThis";

export default {
  dedupArray<T = any>(elements: T[], mark?: string): T[] {
    const dedupArray = elements.filter((ele, index) => {
      if (mark) {
        return elements.findIndex((e) => e[mark] === ele[mark]) === index;
      } else {
        return elements.indexOf(ele) === index;
      }
    });

    return dedupArray;
  },
  debounce<T extends Function>(fn: T, wait: number, immediate?: boolean) {
    let timer: NodeJS.Timeout;
    return (...args: any[]) => {
      let lastArgs = args;
      if (immediate && !timer) {
        timer = (function (lastThis) {
          return setTimeout(() => {
            fn.apply(lastThis, lastArgs);
          }, 0);
        })(this);
      } else {
        clearTimeout(timer);
        timer = (function (lastThis) {
          return setTimeout(() => {
            fn.apply(lastThis, lastArgs);
          }, wait);
        })(this);
      }
    };
  },
  transformAST(astVisitors = visitors, fsContent?: string) {
    try {
      bullet.clearDecorateBullet();
      const auditor = vscode.window.activeTextEditor;
      const code = fsContent || auditor.document.getText();
      traverseAst(parseAst(code), astVisitors);
      bullet.renderTextDocument();
      initGlobalThis();
    } catch(err) {
      bullet.renderTextDocument();
    }
  },
  isPadEndString(str: string, endMark: string): boolean {
    return str.endsWith(endMark) || str.endsWith(endMark + '.git');
  }
};
