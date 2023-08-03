import { curdGenerateTsAstMaps, generateTsTypeMaps } from "./generateTsAstMaps";
import handleTsAstMaps from "./handleTsAstMaps";
import type { TSType, TSPropertySignature, TSUnionType, Node } from "@babel/types";
import { UnionFlowType, SureFlowType } from "../interface";
import * as t from "@babel/types";
import loopPath from '../utils/helpers/loopPath';
import getReturnStatement from "./helpers/getReturnStatement";
import type { IdentifierOptions } from '../interface/handleAst';

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
export const handlePath = (referencePath, tsAstTypes, options?: IdentifierOptions) => {
  let collectTSLock = false; // 开发是否已经定义了类型，有的话则不再收集类型
  referencePath?.path?.container.filter(node => node.name === referencePath?.path?.node?.name).forEach((node) => {
    if (options?.isReturnStatement) {
      if (node.typeAnnotation) {
        tsAstTypes.push(node.typeAnnotation);
      } else if (t.isVariableDeclarator(node) && (node.id as any)?.typeAnnotation) {
        const { id } = node
        tsAstTypes.push((id as any).typeAnnotation);
      } else if (handleTsAstMaps[node.type]) {
        handleTsAstMaps[node.type]?.(node, tsAstTypes, referencePath?.path, options);
      }
      collectTSLock = true;
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
      if (returnASTNode?.members.length > 1) {
        handleRerencePath(restReferencePaths, returnASTNode.members);
        returnASTNode.members = postmathClassMethodTsAst(
          returnASTNode.members
        );
      }
      return returnASTNode;
    } else {
      if (!collectTSLock) {
        handleRerencePath(restReferencePaths, tsAstTypes);
        handleRerencePath(referencePath.constantViolations, tsAstTypes);
      }
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
  Identifier: (bindScopePath, tsAstTypes, options?: IdentifierOptions) => {
    if (!bindScopePath) {
      return t.tsUnknownKeyword();
    }
    if (loopPath(bindScopePath.identifier)) {
      return handlePath(bindScopePath, tsAstTypes, options);
    } else {
      globalThis.isMaxSizeee = bindScopePath.identifier.name // 爆栈
      return t.tsUnknownKeyword();
    }
  },
  /**
   * @description 获取ReturnStatement
   * @param node Node
   */
  ReturnStatement<T extends t.ReturnStatement>(node: t.FunctionDeclaration['body'], path, returnBullet = []): Array<T> {
    const { body } = node;
    if (!body && node.type) {
      returnBullet.push({
        bulletTypeAnnotation: generateTsTypeMaps[node.type]?.(node, path)
      })
    }
    let returnStatement: Node;
    if (
      (returnStatement = body?.find((node: Node) =>
        t.isReturnStatement(node)
      ))
    ) {
      returnBullet.push(returnStatement as t.ReturnStatement);
    }

    const TryStatement = body?.filter((node: Node) => t.isTryStatement(node)) as t.TryStatement[];
    if (TryStatement) {
      returnBullet = getReturnStatement.TryStatement(TryStatement, path, returnBullet)
    }

    const IfStatement = body?.filter((node: Node) => t.isIfStatement(node)) as t.IfStatement[];
    if (IfStatement?.length) {
      returnBullet = getReturnStatement.IfStatement(IfStatement, path, returnBullet)
    }

    const SwitchStatement = body?.filter((node: Node) => t.isSwitchStatement(node)) as t.SwitchStatement[];
    if (SwitchStatement?.length) {
      returnBullet = getReturnStatement.SwitchStatement(SwitchStatement, returnBullet);
    }

    return returnBullet;
  },
};
