/* eslint-disable */

import {
  generateTsTypeMaps,
  curdGenerateTsAstMaps,
  baseTsAstMaps,
} from "./generateTsAstMaps";
import type { Node, Flow, TSType, CallExpression } from "@babel/types";
import type { UnionFlowType } from "../interface";
import handleTsAst, { handleRerencePath } from "./handleTsAst";
const t = require("@babel/types");

const getNodeProperty = {
  AssignmentExpression: (node: UnionFlowType<Node, "AssignmentExpression">) => {
    const { right } = node;

    return right;
  },
  ExpressionStatement: (node: UnionFlowType<Node, "ExpressionStatement">) => {
    const { expression } = node;

    if (t.isAssignmentExpression(expression)) {
      const { right } = expression as UnionFlowType<
        UnionFlowType<Node, "ExpressionStatement">,
        "AssignmentExpression"
      >;

      return right;
    }
  },
  CallExpression() {},
};

const handleTsAstMaps = {
  Identifier(
    node: UnionFlowType<Node, "Identifier">,
    tsAstTypes: Flow[],
    path: any
  ) {
    tsAstTypes.push(node.typeAnnotation || t.tsUnknownKeyword());
  },
  AssignmentExpression: (
    node: UnionFlowType<Node, "AssignmentExpression">,
    tsAstTypes: Flow[],
    path: any
  ) => {
    const { left } = node;

    if (handleTsAstMaps[left.type]) {
      handleTsAstMaps[left.type](left, tsAstTypes, path);
    }
  },
  VariableDeclarator: (
    node: UnionFlowType<Node, "VariableDeclarator">,
    tsAstTypes: Flow[],
    path,
    options?
  ) => {
    const { init, id } = node;

    if ((id as any).typeAnnotation) {
      tsAstTypes.push((id as any).typeAnnotation.typeAnnotation);
    }

    if (generateTsTypeMaps[init.type]) {
      tsAstTypes.push(generateTsTypeMaps[init.type]?.(init, path));
    }
  },
  AwaitExpression(
    node: UnionFlowType<Node, "AwaitExpression">,
    tsAstTypes: TSType[],
    path
  ) {
    const { argument } = node

    if ((argument as CallExpression).typeParameters) {
      return (argument as CallExpression).typeParameters
    }
  },
  ExpressionStatement(
    node: UnionFlowType<Node, "ExpressionStatement">,
    tsAstTypes,
    path
  ) {
    const { expression } = node;
    tsAstTypes.push(generateTsTypeMaps[expression.type]?.(expression, path));
  },
  MemberExpression: (containerNode, tsAstTypes, path, options?) => {
    const property = containerNode.property.name as string;
    const isIdentifier = t.isIdentifier(
      getNodeProperty[path.parentPath.container.type]?.(
        path.parentPath.container,
        path
      )
    );
    if (isIdentifier) {
      const variable = path.parentPath.scope.bindings[property];
      (variable?.path?.container || [])?.forEach((node) => {
        const key = node.id?.name;
        const tsType = t.tsPropertySignature(
          t.stringLiteral(key),
          t.tsTypeAnnotation(
            generateTsTypeMaps[node.init.type](node.init, path, {
              optional: t.isBlockStatement(path.scope.block),
            })
          )
        );

        (tsType.optional = t.isBlockStatement(path.scope.block)),
          tsAstTypes.push(tsType);
      });

      if (Array.isArray(tsAstTypes)) {
        const curentTsNode = tsAstTypes.find(
          (tsnode) => tsnode.key?.value === property
        );
        if (curentTsNode) {
          curentTsNode.value = curdGenerateTsAstMaps[
            baseTsAstMaps.includes(curentTsNode?.value?.type)
              ? "BaseTypeUnionAnnotation"
              : curentTsNode.value?.type
          ]?.(
            curentTsNode.value,
            handleRerencePath(
              variable.referencePaths?.filter(
                (refer) => refer.key !== "right"
              ) || [],
              []
            )
          );
        }
      }
    } else {
      const { parentPath } = path;
      tsAstTypes.push(
        generateTsTypeMaps[parentPath.type](parentPath.node, parentPath, {
          optional: t.isBlockStatement(parentPath.scope.block),
        })
      );
    }
  },
};

export default handleTsAstMaps;
