import loopPath from "./loopPath";

export default function initGlobalThis() {
  globalThis.isMaxSizeee = false;
  loopPath.loopPathMap.clear();
}