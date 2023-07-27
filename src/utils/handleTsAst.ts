import { curdGenerateTsAstMaps } from "./generateTsAstMaps";
import handleTsAstMaps from "./handleTsAstMaps";
import type { Flow, Node } from "@babel/types";
import { UnionFlowType, SureFlowType } from "../interface";
import * as t from "@babel/types";

// 当tsAstTypes收集到所有类型后, 开始做预后联合，将重复属性拼凑为联合类型
const postmathClassMethodTsAst = (tsAstTypes: Flow[]) => {
  const redundancFlowMap: Map<string, Flow> = new Map();
  const redundancFlowArray: Flow[] = [];

  tsAstTypes?.forEach((flow) => {
    if (
      t.isObjectTypeProperty(flow) &&
      SureFlowType<Flow, UnionFlowType<Flow, "ObjectTypeProperty">>(flow)
    ) {
      const { value } = (flow as UnionFlowType<Flow, "ObjectTypeProperty">)
        .key as UnionFlowType<
        UnionFlowType<Flow, "ObjectTypeProperty">["key"],
        "StringLiteral"
      >;
      const memoryFlowType = redundancFlowMap.get(value);
      if (!memoryFlowType) {
        redundancFlowArray.push(flow);
        redundancFlowMap.set(value, flow);
      } else if (
        SureFlowType<Flow, UnionFlowType<Flow, "ObjectTypeProperty">>(
          memoryFlowType
        )
      ) {
        if (flow.variance && !memoryFlowType.variance) {
          memoryFlowType.variance = flow.variance;
        }
        memoryFlowType.value = curdGenerateTsAstMaps.BaseTypeUnionAnnotation(
          t.isUnionTypeAnnotation(memoryFlowType.value)
            ? (
                memoryFlowType.value as UnionFlowType<
                  Node,
                  "UnionTypeAnnotation"
                >
              ).types
            : memoryFlowType.value,
          flow.value
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
  referencePath?.path?.container.forEach((node) => {
    if (node.typeAnnotation) {
      tsAstTypes.push(node.typeAnnotation);
    } else if (handleTsAstMaps[node.type]) {
      handleTsAstMaps[node.type]?.(node, tsAstTypes, referencePath?.path);
    }
  });

  if (tsAstTypes.length) {
    const returnASTNode = tsAstTypes[0];
    const restReferencePaths = referencePath.referencePaths?.filter(
      (path) => path.key !== "body" && path.key !== "right"
    );
    if (returnASTNode.properties) {
      handleRerencePath(restReferencePaths, returnASTNode.properties);
      returnASTNode.properties = postmathClassMethodTsAst(
        returnASTNode.properties
      );
    }

    return returnASTNode;
  } else {
    return t.voidTypeAnnotation();
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
  ReturnStatement(node: t.FunctionDeclaration['body']) {
    const { body } = node;
    let returnStatement: Node;
    if (
      (returnStatement = body?.find((node: Node) =>
        t.isReturnStatement(node)
      ))
    ) {
      return returnStatement as t.ReturnStatement; 
    }

    const TryStatement = body?.find((node: Node) => t.isTryStatement(node)) as t.TryStatement;
    if (TryStatement) {
      if (returnStatement = this.ReturnStatement(TryStatement.block)) {
        return returnStatement  as t.ReturnStatement;
      }
    }

    const IfStatement = body?.find((node: Node) => t.isIfStatement(node)) as t.IfStatement;
    if (IfStatement) {
      let { alternate, consequent } = IfStatement;
      let ifStatementBodyNoode;
      while ((alternate = (alternate as any)?.alternate, alternate)) {
        ifStatementBodyNoode = alternate;
      }
      if (returnStatement = this.ReturnStatement(ifStatementBodyNoode)) {
        return returnStatement  as t.ReturnStatement;
      }
    }
  },
};
