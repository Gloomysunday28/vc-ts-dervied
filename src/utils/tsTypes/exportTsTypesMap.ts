import type { UnionFlowType } from "../../interface";
import type { TSType, Node } from '@babel/types';
import * as t from '@babel/types';
import { unionUtils } from "../helpers/union";
import { generateTsTypeMaps } from "./generateTsAstMaps";

export default {
  TSInterfaceDeclaration(node: UnionFlowType<TSType, 'TSInterfaceDeclaration'>, property: Node) {
    const { body } = node;

    // @ts-ignore
    const interfaceProperty = body.body?.find(n => n?.key?.name === property?.name);
    return interfaceProperty?.typeAnnotation?.typeAnnotation;
  },
  VariableDeclaration(node: UnionFlowType<Node, 'VariableDeclaration'>, property: UnionFlowType<Node, 'Identifier'>, path) {
    const { declarations } = node;

    // @ts-ignore
    const unionTSType = declarations.map(declara => t.isObjectExpression(declara.init) ? (declara.init as UnionFlowType<Node, 'ObjectExpression'>)?.properties.find(p => ((p as UnionFlowType<Node, 'ObjectProperty'>)?.key as UnionFlowType<Node, 'Identifier'>)?.name === property?.name)?.value || declara.init : declara.init);
    return unionUtils.UnionType(unionTSType.map(tsType => generateTsTypeMaps[tsType.type]?.(tsType, path)));
  }
};