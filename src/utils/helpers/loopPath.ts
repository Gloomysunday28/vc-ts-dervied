import { type Identifier } from "@babel/types";

loopPath.loopPathMap = new Map([])
export default function loopPath(node: Identifier) {
  const count = loopPath.loopPathMap.get(node.name) as number || 0
  if (count < globalThis.loopPathLimit) {
    loopPath.loopPathMap.set(node.name, count + 1)
    return true
  }

  return false
}