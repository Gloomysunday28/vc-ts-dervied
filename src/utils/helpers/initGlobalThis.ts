import loopPath from "./loopPath";

export default function initGlobalThis() {
  globalThis.isMaxSizeee = false;
  globalThis.exportsIndentifer = {};
  globalThis.reactPropsAndState = {};
  globalThis.returnStatement = null;
  globalThis.identifierName = null;
  loopPath.loopPathMap.clear();
}