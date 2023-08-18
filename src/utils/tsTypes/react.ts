/* eslint-disable */
// @ts-nocheck
import * as t from "@babel/types";
import { UnionFlowType } from "../../interface";
import exportTsAst from "./exportTsAst";
import { generateTsTypeMaps } from "./generateTsAstMaps";
import source from "../helpers/source";

export default {
  reactMarkFields: ["props", "state"],
  getClassParentPath(path) {
    let parentPath = path;

    while (parentPath) {
      if (parentPath?.node?.type === "ClassDeclaration") {
        return parentPath;
      }
      parentPath = parentPath.parentPath;
    }
  },
  getProgramPath(path) {
    let parentPath = path;

    while (parentPath) {
      if (parentPath?.node?.type === "Program") {
        return parentPath;
      }
      parentPath = parentPath.parentPath;
    }
  },
  getGlobalTSInterface(path, props, state?) {
    let propsTSType;
    let stateTSType;
    this.getProgramPath(path).traverse({
      "TSInterfaceDeclaration|TSTypeAliasDeclaration": (path) => {
        const { node } = path;
        const { id } = node;
        if (id?.name === props.typeName?.name) {
          propsTSType = node;
          const exportTsAstTs = exportTsAst(
            node.extends?.[0]?.expression || {},
            node.extends?.[0]?.expression || {},
            path
          );
          if (exportTsAstTs && propsTSType?.body?.body) {
            propsTSType.body.body = [
              ...propsTSType?.body?.body.map((tsType) => {
                const exportTsAstTs = exportTsAst(
                  tsType?.typeAnnotation?.typeAnnotation?.typeName,
                  tsType?.typeAnnotation?.typeAnnotation?.typeName,
                  path
                );

                if (exportTsAstTs) {
                  tsType.typeAnnotation.typeAnnotation = exportTsAstTs;
                }
                return tsType;
              }),
              ...exportTsAstTs?.body?.body,
            ];
          }
          path.skip();
        } else if (id?.name === state?.typeName?.name) {
          stateTSType = node;
          const exportTsAstTs = exportTsAst(
            node.extends?.[0]?.expression || {},
            node.extends?.[0]?.expression || {},
            path
          );
          if (exportTsAstTs && stateTSType?.body?.body) {
            stateTSType.body.body = [
              ...stateTSType?.body?.body.map((tsType) => {
                const exportTsAstTs = exportTsAst(
                  tsType?.typeAnnotation?.typeAnnotation?.typeName,
                  tsType?.typeAnnotation?.typeAnnotation?.typeName,
                  path
                );

                if (exportTsAstTs) {
                  tsType.typeAnnotation.typeAnnotation = exportTsAstTs;
                }
                return tsType;
              }),
              ...exportTsAstTs?.body?.body,
            ];
          }
          path.skip();
        } else {
          path.skip();
        }
      },
    });

    return {
      propsTSType,
      stateTSType,
    };
  },
  // 获取Props和State的interface AST
  getClassPropsAndState(path) {
    const classDeclarationPath = this.getClassParentPath(path);

    if (classDeclarationPath) {
      const { superTypeParameters } = classDeclarationPath.node;

      const [props, state] = superTypeParameters?.params || [];
      let propsTSType;
      let stateTSType;
      if (
        (props && t.isIdentifier(props.typeName)) ||
        (state && t.isIdentifier(state.typeName))
      ) {
        const interfaceRes = this.getGlobalTSInterface(path, props, state);
        propsTSType = interfaceRes.propsTSType;
        stateTSType = interfaceRes.stateTSType;
      }
      return {
        props: propsTSType,
        state: stateTSType,
      };
    }
  },
  getVariableKeys(node: UnionFlowType<t.Node, 'Identifier'>, path) {
    const keys = []
    let variableNode = node
    while (variableNode && t.isIdentifier(variableNode)) {
      keys.unshift(variableNode.name)
      const { node: identifierNode } = source.getIdentifierSource(path, variableNode) || {}
      variableNode = identifierNode
    }

    return keys
  },
  // 获取x.y.z格式的keys集合 -> [x, y, z]
  getPropsAndStateMemberExpression(node, isReactComponent = true /* 解析 */) {
    let { object, property } = node;
    const keys = [];

    while (t.isMemberExpression(object)) {
      keys.unshift(property.name);
      property = object.property;
      object = object.object;
    }

    if (t.isIdentifier(property)) {
      if (!this.reactMarkFields.includes(property.name)) {
        keys.unshift(property.name);
      }
    }

    if (isReactComponent) {
      if (t.isIdentifier(object)) {
        if (!this.reactMarkFields.includes(object.name)) {
          keys.unshift(object.name);
        }
      }
    }

    return {
      object: object,
      property,
      keys,
    };
  },
  getTSPropertySignatureTypeAnnotation(typeAnnotation, keys: string[]) {
    let { members = [] } = typeAnnotation;

    let keyName = keys.shift();
    let tsType;
    if (keyName) {
      while (keyName) {
        tsType = members?.find((member) => member?.key?.name === keyName);
        members = tsType?.typeAnnotation?.typeAnnotation?.members || [];
        keyName = keys.shift();
      }
      if (tsType) {
        return tsType.typeAnnotation.typeAnnotation;
      }
    } else {
      return typeAnnotation;
    }
  },
  getTSMemberBody(tsReference) {
    return t.isTSInterfaceDeclaration(tsReference)
    ? tsReference.body?.body || []
    : t.isTSTypeLiteral(tsReference)
    ? tsReference.members
    : []
  },
  getDeepPropertyTSType(props, keys, path) {
    if (props) {
      let key,
        anotherProps = props,
        tsType;
      if (globalThis.isSpreadElement) {
        tsType = anotherProps;
        anotherProps = tsType;
      } else {
        while ((key = keys.shift())) {
          let properties = []
          if (t.isTSUnionType(anotherProps)) {
            const reference = anotherProps.types.find(p => t.isTSTypeReference(p))
            if (reference) {
              const r = this.getGlobalTSInterface(path, reference)
              properties = this.getTSMemberBody(r.propsTSType)
            }
          } else if (t.isTSTypeReference(anotherProps)) {
            const r = this.getGlobalTSInterface(path, anotherProps)
            properties = this.getTSMemberBody(r.propsTSType)
          } else {
            properties = this.getTSMemberBody(anotherProps)
          }
       
          tsType = properties?.find((pro) => pro.key?.name === key);
          anotherProps =
            tsType?.typeAnnotation?.typeAnnotation || t.tsNeverKeyword();
        }
      }
      if (tsType) {
        if (t.isTSInterfaceDeclaration(anotherProps)) {
          const {
            body: { body },
          } = anotherProps;

          return t.tsTypeLiteral(body);
        }
        return t.isTSType(anotherProps)
          ? anotherProps
          : generateTsTypeMaps[anotherProps.type]?.(anotherProps, path) ||
              anotherProps;
      } else {
        return anotherProps;
      }
    }
  },
  getReactMemberExpression(
    node: UnionFlowType<t.Node, "MemberExpression">,
    path,
    memberKeys?: string[]
  ) {
    if (!memberKeys && !t.isMemberExpression(node) && !t.isOptionalMemberExpression(node)) return;
    const { property, object, keys } = this.getPropsAndStateMemberExpression(
      node,
      true
    );
    const { props, state } = globalThis.reactPropsAndState || {};
    if (
      object.property?.name === "props" ||
      property?.name === "props" ||
      object.property?.name === "state" ||
      property?.name === "state" ||
      object?.name === 'props'
    ) {
      if (props) {
        const {
          body: { body = [] },
        } = props;
        const tsType = body.find(
          (tsTypeParam) =>
            tsTypeParam?.key?.name ===
            (property?.name === "props"
              ? globalThis.identifierName
              : property.name)
        );
        const objectTsType = body.find((tsTypeParam) =>
          globalThis?.returnStatement?.argument?.properties?.some(
            (argu) => argu?.key?.name === tsTypeParam?.key?.name
          )
        );
        if (tsType) {
          return tsType.typeAnnotation.typeAnnotation;
        }

        if (objectTsType) {
          return objectTsType.typeAnnotation.typeAnnotation;
        }
      }

      if (state) {
        const {
          body: { body = [] },
        } = state;
        const key = memberKeys ? memberKeys.shift() : keys.shift();
        const tsType = body.find(
          (tsTypeParam) =>
            tsTypeParam?.key?.name ===
            (key ||
              (property?.name === "state"
                ? globalThis?.returnStatement?.argument?.name
                : property.name))
        );
        const objectTsType = body.find((tsTypeParam) =>
          globalThis?.returnStatement?.argument?.properties?.some(
            (argu) => argu?.key?.name === tsTypeParam?.key?.name
          )
        );
        const arrayTsType = body.find(
          (tsTypeParam) =>
            globalThis?.arrayExpressionElement?.name === tsTypeParam?.key?.name
        );
        if (tsType) {
          return this.getTSPropertySignatureTypeAnnotation(
            tsType.typeAnnotation.typeAnnotation,
            memberKeys || keys
          );
        }
        if (objectTsType) {
          return objectTsType.typeAnnotation.typeAnnotation;
        }
        if (arrayTsType) {
          return arrayTsType.typeAnnotation.typeAnnotation;
        }
      }
    } else {
      const scopeNode = path.scope.getBinding(object?.name);
      if (
        scopeNode &&
        t.isVariableDeclarator(scopeNode.path.node) &&
        t.isMemberExpression(scopeNode.path.node.init) &&
        this.reactMarkFields.includes(scopeNode.path.node.init.property.name)
      ) {
        return this.getDeepPropertyTSType(
          scopeNode.path.node.init.property.name === "props" ? props : state,
          memberKeys || keys,
          path
        );
      }
    }
  },
};
