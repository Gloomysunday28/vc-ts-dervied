import { curdGenerateTsAstMaps } from "./generateTsAstMaps";
import handleTsAstMaps from "./handleTsAstMaps";
import type { TSType, TSPropertySignature, TSUnionType, Node } from "@babel/types";
import { UnionFlowType, SureFlowType } from "../interface";
import * as t from "@babel/types";

// 当tsAstTypes收集到所有类型后, 开始做预后联合，将重复属性拼凑为联合类型
const postmathClassMethodTsAst = (tsAstTypes: TSType[]) => {
  const redundancFlowMap: Map<string, TSPropertySignature> = new Map();
  const redundancFlowArray: TSPropertySignature[] = [];

  tsAstTypes?.forEach((flow) => {
    if (
      t.isTSPropertySignature(flow) &&
      SureFlowType<TSPropertySignature>(flow)
    ) {
      const { value } = (flow as TSPropertySignature)
        .key as UnionFlowType<
          UnionFlowType<TSType, "TSPropertySignature">["key"],
          "StringLiteral"
        >;
      const memoryFlowType = redundancFlowMap.get(value);
      if (!memoryFlowType) {
        redundancFlowArray.push(flow);
        redundancFlowMap.set(value, flow);
      } else if (
        SureFlowType<TSPropertySignature>(
          memoryFlowType
        )
      ) {
        if ((flow as TSPropertySignature).optional && !memoryFlowType.optional) {
          memoryFlowType.optional = (flow as TSPropertySignature).optional;
        }
        memoryFlowType.typeAnnotation.typeAnnotation = curdGenerateTsAstMaps.BaseTypeUnionAnnotation(
          t.isTSUnionType(memoryFlowType.typeAnnotation.typeAnnotation)
            ? (
              memoryFlowType.typeAnnotation.typeAnnotation as TSUnionType
            ).types
            : memoryFlowType.typeAnnotation.typeAnnotation,
          (flow as TSPropertySignature).typeAnnotation.typeAnnotation
        );
      }
    }
  });

  return redundancFlowArray;
};

// 针对当前变量对应的局部作用域下可能会更改该变量的类型进行收集
export const handleRerencePath = (referencePath, tsAstTypes) => {
  (referencePath || []).forEach((path) => {
    const containerNode = path.container;
    if (handleTsAstMaps[containerNode.type]) {
      handleTsAstMaps[containerNode.type]?.(containerNode, tsAstTypes, path);
    }
  });

  return tsAstTypes;
};

// 针对该变量定义时的变了进行类型收集
export const handlePath = (referencePath, tsAstTypes) => {
  referencePath?.path?.container.filter(node => node.name === referencePath?.path?.node?.name).forEach((node) => {
    if (node.typeAnnotation) {
      tsAstTypes.push(node.typeAnnotation);
    } else if (handleTsAstMaps[node.type]) {
      handleTsAstMaps[node.type]?.(node, tsAstTypes, referencePath?.path);
    }
  });

  const restReferencePaths = referencePath.referencePaths?.filter(
    (path) => path.key !== "body" && path.key !== "right" && !t.isReturnStatement(path.container)
  );
  if (tsAstTypes.length) {
    const returnASTNode = tsAstTypes[0];
    if (returnASTNode.members && returnASTNode.members?.length) {
      handleRerencePath(restReferencePaths, returnASTNode.members);
      returnASTNode.members = postmathClassMethodTsAst(
        returnASTNode.members
      );
      return returnASTNode;
    } else {
      handleRerencePath(restReferencePaths, tsAstTypes);
      handleRerencePath(referencePath.constantViolations, tsAstTypes);
      if (tsAstTypes.length) {
        if (tsAstTypes.length === 1) {
          return tsAstTypes[0]
        } else {
          return t.tsUnionType(tsAstTypes)
        }
      }
    }
  } else {
    return t.tsVoidKeyword();
  }
};

export default {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Identifier: (bindScopePath, tsAstTypes) => {
    return handlePath(bindScopePath, tsAstTypes);
  },
  /**
   * @description 获取ReturnStatement
   * @param node Node
   */
  ReturnStatement(node: t.FunctionDeclaration['body'], returnBullet = []) {
    const { body } = node;
    let returnStatement: Node;
    if (
      (returnStatement = body?.find((node: Node) =>
        t.isReturnStatement(node)
      ))
    ) {
      returnBullet.push(returnStatement as t.ReturnStatement);
    }

    const TryStatement = body?.find((node: Node) => t.isTryStatement(node)) as t.TryStatement;
    if (TryStatement) {
      if (returnStatement = this.ReturnStatement(TryStatement.block)) {
        returnBullet = returnBullet.concat(returnStatement as t.ReturnStatement);
      }
    }

    const IfStatement = body?.find((node: Node) => t.isIfStatement(node)) as t.IfStatement;
    if (IfStatement) {
      let { alternate } = IfStatement;
      let ifStatementBodyNoode;
      while ((alternate = (alternate as any)?.alternate, alternate)) {
        ifStatementBodyNoode = alternate;
      }
      if (ifStatementBodyNoode && (returnStatement = this.ReturnStatement(ifStatementBodyNoode))) {
        returnBullet = returnBullet.concat(returnStatement as t.ReturnStatement);
      }
    }

    return returnBullet;
  },
};
