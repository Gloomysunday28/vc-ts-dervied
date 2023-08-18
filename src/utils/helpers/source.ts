import { Node, isVariableDeclarator, isIdentifier, isLogicalExpression } from "@babel/types"
import { UnionFlowType } from "../../interface";

export default {
  getIdentifierSource(path, node: UnionFlowType<Node, 'Identifier'>) {
    const source = path.scope.getAllBindings()?.[node.name];

    if (source) {
      const variable = source.path.container.find(node => isVariableDeclarator(node));
      if (variable && isIdentifier(variable.init)) {
        return {
          node:variable.init,
          isExpression: false
        }
      }
      if (variable && isLogicalExpression(variable.init)) {
        return {
          node: isIdentifier(variable.init.left) ? variable.init.left : variable.init.right,
          isExpression: true
        }
      }
    }
  }
};
