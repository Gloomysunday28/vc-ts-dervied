/* eslint-disable */
// @ts-nocheck
import type { GenerateTsAstMapsOption } from "../../interface/generateTsAstMapsDto";
import type { KeyofObject, UnionFlowType } from "../../interface";
import handleTsAst from "./handleTsAst";
import { getReturnBulletTypeAnnotation } from '../../core/visitors/FunctionDeclaration'
import operator from "../helpers/operator";
import type {
  ObjectTypeProperty,
  ObjectTypeSpreadProperty,
  Identifier, // JSType
  Expression,
  Node, // JSType
  Flow, // FlowType
  TSType, // TSType
} from "@babel/types";
import * as t from "@babel/types";
import { esRender } from '../../core/render/es'
import { unionUtils } from '../helpers/union'
import exportTsAst from '../../utils/tsTypes/exportTsAst'
import reactTsAst from '../../utils/tsTypes/react'

//  js类型与Flow ast映射关系 只针对该类型生成TSType
const generateTsTypeMap: {
  [key: string]: (...args: unknown[]) => Flow | Flow[] | any;
} = {
  undefined: t.tsVoidKeyword,
  NullLiteral: t.tsNullKeyword,
  number: (node: UnionFlowType<Node, "NumberLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSNumberKeyword();
  }, // js表达式
  NumberLiteral: (node: UnionFlowType<Node, "NumberLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSNumberKeyword();
  },
  NumericLiteral: (node: UnionFlowType<Node, "NumberLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSNumberKeyword();
  }, // js表达式
  TSNumberKeyword: (node: UnionFlowType<Node, "NumberLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSNumberKeyword();
  }, // TS类型
  string: (node: UnionFlowType<Node, "StringLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSStringKeyword();
  },
  StringLiteral: (node: UnionFlowType<Node, "StringLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSStringKeyword();
  },
  TemplateLiteral: (node: UnionFlowType<Node, "StringLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSStringKeyword();
  },
  TSStringKeyword: (node: UnionFlowType<Node, "StringLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSStringKeyword();
  },
  boolean: (node: UnionFlowType<Node, "BooleanLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSBooleanKeyword();
  },
  BooleanLiteral: (node: UnionFlowType<Node, "BooleanLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSBooleanKeyword();
  },
  TSBooleanKeyword: (node: UnionFlowType<Node, "BooleanLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSBooleanKeyword();
  },
  TSLiteralType: (node: UnionFlowType<Node, 'TSLiteralType'>, path) => {
    const { literal } = node

    if (literal) {
      return generateTsTypeMap[literal.type](literal, path)
    }
  },
  ParamterDeclaration: (params: UnionFlowType<Node, "Identifier">[]) => {
    return t.typeParameterDeclaration(
      params.map((param) =>
        t.typeParameter(
          t.typeAnnotation(
            generateTsTypeMap[
              (param.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">)
                .typeAnnotation?.type
            ]?.()
          )
        )
      )
    );
  },
  FunctionTypeParam: (params: UnionFlowType<Node, "Identifier">[]) => {
    return params?.map((param) =>
      t.functionTypeParam(
        t.identifier(param.name),
        generateTsTypeMap[
          (param.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">)
            .typeAnnotation?.type
        ]?.()
      )
    );
  },
  FunctionExpression: (
    node: UnionFlowType<Flow, "ArrowFunctionExpression">,
    path: any,
    options: {
      returnType?: Node;
    }
  ) => {
    const { params } = node;
    const paramsType = generateTsTypeMap.ParamterDeclaration(params);
    const functionParams = generateTsTypeMap.FunctionTypeParam(params);
    const restParams = null;

    return t.tsDeclareFunction(
      paramsType,
      functionParams,
      restParams,
      options.returnType
        ? generateTsTypeMap[options.returnType.type](options.returnType)
        : t.tsAnyKeyword()
    );
  },
  AwaitExpression(node: UnionFlowType<Node, "AwaitExpression">, path) {
    const { argument } = node

    if ((argument as CallExpression).typeParameters) {
      return unionUtils.UnionType((argument as CallExpression).typeParameters.params)
    }
    // TODO:
    return t.tsUnknownKeyword()
  },
  VariableDeclarator: (
    node: UnionFlowType<Node, "VariableDeclarator">,
    path,
    option?: GenerateTsAstMapsOption
  ) => {
    const { init } = node;

    return generateTsTypeMaps[(init as Expression)?.type]?.(init, path, option);
  },
  NewExpression(node: UnionFlowType<Node, "NewExpression">, path) {
    const { callee, arguments: bodyState } = node;
    const [argument] = bodyState;
    let returnType = t.tsUnknownKeyword(),
      paramsType;
    if (
      argument &&
      (t.isFunctionExpression(argument) ||
        t.isArrowFunctionExpression(argument))
    ) {
      const { body, params } = argument;
      paramsType = generateTsTypeMap.TsTypeParameterDeclaration(params || []);
      const returnStatement = (body.body || []).find((param) =>
        t.isReturnStatement(param)
      );
      if (callee.name === "Promise") {
        const promiseStatusfn = argument.body?.body?.find(
          (promiseStatus) =>
            t.isExpressionStatement(promiseStatus) &&
            t.isCallExpression(promiseStatus?.expression) &&
            argument.params?.some(
              (param) => param.name === promiseStatus.expression.callee.name
            )
        );
        const promiseArgument = promiseStatusfn?.expression?.arguments?.[0];
        if (promiseArgument) {
          returnType = generateTsTypeMap[promiseArgument.type](promiseArgument)
        }
      }
      if (returnStatement && t.isCallExpression(returnStatement.argument)) {
        const { argument } = returnStatement;
        returnType = argument?.arguments?.[0];
      }
    }
    return t.tsTypeLiteral([
      t.tsConstructSignatureDeclaration(
        paramsType,
        [t.identifier(callee.name)],
        t.tsTypeAnnotation(returnType)
      ),
    ]);
  },
  OptionalMemberExpression(
    node: UnionFlowType<Node, "OptionalMemberExpression">,
    path
  ) {
    const { property } = node;
    return handleTsAst.Identifier(path.scope.getBinding(property.name), []);
  },
  ObjectExpression: <
    T extends {
      properties: Array<ObjectTypeProperty | ObjectTypeSpreadProperty>;
    }
  >(
    node: T | ObjectTypeProperty[] | ObjectTypeSpreadProperty[],
    path,
    option?: GenerateTsAstMapsOption
  ) => {
    if (Array.isArray(node)) {
      return t.objectTypeAnnotation(node);
    } else {
      const { properties } = node;
      if (!properties.length) {
        return t.tsTypeReference(t.identifier('Record'), t.tsTypeParameterInstantiation([t.tsStringKeyword(), t.tsAnyKeyword()]))
      }
      return t.TSTypeLiteral(
        properties.map(
          (propert: ObjectTypeProperty | ObjectTypeSpreadProperty) => {
            let keyName = (((propert as ObjectTypeProperty).key as Identifier)?.name ||
            (propert as ObjectTypeProperty).key) as string
            if ((propert as ObjectTypeProperty).key) {
              if (propert.computed) {
                const scopeIdnetifier = path.scope.getAllBindings()?.[propert.key.name]
                if (scopeIdnetifier) {
                    const value = generateTsTypeMap[scopeIdnetifier.path.node.type]?.(scopeIdnetifier.path.node, path)
                  if (t.isTSLiteralType(value)) {
                    keyName = value.literal.value
                  }
                }
              }
              const tsType = t.tsPropertySignature(
                t.stringLiteral(keyName),
                t.tsTypeAnnotation(
                  generateTsTypeMap[(propert as ObjectTypeProperty).value.type]?.(
                    propert.value,
                    path
                  )
                )
              );

              tsType.optional =
                option?.optional || t.isOptionalMemberExpression(propert.value);
              return tsType;
            }
          }
        ) as Array<ObjectTypeProperty | ObjectTypeSpreadProperty>
      );
    }
  },
  ArrowFunctionExpression: (
    node: UnionFlowType<Flow, "ArrowFunctionExpression">,
    path
  ) => {
    const { params = [], body } = node;
    const paramsType = generateTsTypeMap.TsTypeParameterDeclaration(params);

    return t.tsFunctionType(
      paramsType,
      params.map((param) => t.isRestElement(param) ? t.restElement(t.identifier(param.argument?.name)) : t.identifier(param.name)),
      t.tsTypeAnnotation(
        (t.isIdentifier(body)
          ? handleTsAst.Identifier(path.scope.getBinding(body.name), [])
          : generateTsTypeMaps[body.type]?.(body, path)) || t.tsUnknownKeyword()
      )
    );
  },
  BlockStatement(node: UnionFlowType<Flow, "ArrowFunctionExpression">['body'], path, options) {
    const { references } = getReturnBulletTypeAnnotation(node.body, path, path.node?.async)

    if (references) {
      return references.typeAnnotation
    }

    return t.tsUndefinedKeyword();
  },
  // 参数类型
  TsTypeParameterDeclaration: (params: UnionFlowType<Node, "Identifier">[]) => {
    // t.isRestElement(param) ? t.restElement(param.argument.name, null, null, param.argument?.typeAnnotation?.typeAnnotation) 
    return t.tsTypeParameterDeclaration(
      params.map((param) => {
        const type = (
          param?.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">
        )?.typeAnnotation;
        return t.tsTypeParameter(
          type || t.tsUnknownKeyword(),
          null,
          t.isRestElement(param) ? param.argument?.name : param.name
        );
      })
    );
  },
  // 对象属性
  MemberExpression: (
    node: UnionFlowType<Node, "MemberExpression">,
    path: any,
    option?: GenerateTsAstMapsOption
  ) => {
    const { property, object } = node;
    const { parent } = path;

    const tsType = reactTsAst.getReactMemberExpression(node, path)
    if (tsType) {
      return tsType
    }

    const typeAnnotation = exportTsAst(object, property, path)
    if (typeAnnotation) {
      return typeAnnotation
    }

    if (t.isIdentifier(property)) {
      if (parent.right) {
        const { name } = property;
        const tsType = t.tsPropertySignature(
          t.stringLiteral(name),
          t.tsTypeAnnotation(
            generateTsTypeMap[parent?.right?.type]?.(parent.right, path, option)
          )
        );
        tsType.optional = option.optional;
        return tsType;
      } else {
        const tsType = esRender.renderESGeneric(property)
        if (tsType) return tsType
      }
    } else if (property.type === "PrivateName") {
    } else {
      // expression 表达式
    }

    if (generateTsTypeMap[object.type]) {
      if ((t.isIdentifier(object) && option?.isReturnStatement) || !option?.isReturnStatement) {
        const typeAnnotation = generateTsTypeMap[object.type]?.(object, path, option)
  
        if (typeAnnotation) return typeAnnotation
      }
    }
  },
  OptionalMemberExpression: (
    node: UnionFlowType<Node, "OptionalMemberExpression">,
    path: any,
    option?: GenerateTsAstMapsOption
  ) => {
    const { property, object } = node;
    const { parent } = path;
    if (t.isIdentifier(property)) {
      if (parent.right) {
        const { name } = property;
        const tsType = t.tsPropertySignature(
          t.stringLiteral(name),
          t.tsTypeAnnotation(
            generateTsTypeMap[parent?.right?.type]?.(parent.right, path, option)
          )
        );
        tsType.optional = option.optional;
        return tsType;
      } else {
        const tsType = esRender.renderESGeneric(property)
        if (tsType) return tsType
      }
    } else if (property.type === "PrivateName") {
    } else {
      // expression 表达式
    }

    if (t.isIdentifier(object)) {
      const identifierPath = path.scope.getBinding(object.name)?.identifier;
      const typeAnnotation = identifierPath?.typeAnnotation?.typeAnnotation

      if (typeAnnotation) {
        return typeAnnotation;
      }
    }

    if (generateTsTypeMap[object.type]) {
      if ((t.isIdentifier(object) && option?.isReturnStatement) || !option?.isReturnStatement) {
        const typeAnnotation = generateTsTypeMap[object.type]?.(object, path, option)
  
        if (typeAnnotation) return typeAnnotation
      }
    }

    return t.tsUnknownKeyword()
  },
  baseTsAstMapsExpression(node, type, option, path) {
    return baseTsAstMaps.includes(type)
      ? t.tsTypeAnnotation(generateTsTypeMap[type](node, path, option))
      : generateTsTypeMap[type](node, path, option);
  },
  // 数组
  ArrayExpression: (
    node: UnionFlowType<Flow, "ArrayExpression">,
    path: any
  ) => {
    const { elements } = node;
    if (Array.isArray(elements)) {
      return t.tsTupleType(
        (elements as TSType[])?.map((ele) => {
          globalThis.arrayExpressionElement = ele;
          if (t.isIdentifier(ele)) {
            const bindScopePath =
              path.scope.bindings[(ele as unknown as Identifier).name];
            return handleTsAst.Identifier(bindScopePath, []);
          }

          return generateTsTypeMap[ele.type](ele, path);
        })
      );
    }

    return null;
  },
  BinaryExpression(node: UnionFlowType<Flow, "BinaryExpression">, path) {
    const referenceType = operator.operatorType(node.operator, node, path);
    return generateTsTypeMap[referenceType]?.();
  },
  LogicalExpression(node: UnionFlowType<TSType, "LogicalExpression">, path) {
    const referenceType = operator.operatorType(node.operator, node, path);
    return referenceType;
  },
  OptionalCallExpression(node: UnionFlowType<TSType, "OptionalCallExpression">, path) {
    const { callee } = node
    return t.isOptionalMemberExpression(callee) ? t.tsUnionType([generateTsTypeMap[callee.type]?.(callee, path), t.tsVoidKeyword()]) : t.tsVoidKeyword()
  },
  Identifier(node: UnionFlowType<TSType, "Identifier">, path, option) {
    const tsyTypes = []
    const isBaseIdentifier = baseTsAstMaps.find(baseTSType => baseTSType.startsWith(node.name))
    if (isBaseIdentifier) {
      tsyTypes.push(generateTsTypeMap[isBaseIdentifier]())
    }
    const typeAnnotation =  exportTsAst(node, node, path)
    if (typeAnnotation) {
      return typeAnnotation
    }
    handleTsAst.Identifier(path.scope.getBinding(node.name), tsyTypes, option)
    if (tsyTypes.length) {
      if (tsyTypes.length === 1) {
        const tsType = tsyTypes[0]
        return t.isTSTypeAnnotation(tsType) ? tsType.typeAnnotation : tsType
      } else {
        return t.tsUnionType(tsyTypes)
      }
    }

    return t.tsUnknownKeyword()
  },
  /**
   * 
   * @param node.arguments是函数里的参数 callee是调用对象
   * @param path 
   * @returns 
   */
  CallExpression(node: UnionFlowType<TSType, "CallExpression">, path) {
    const { callee } = node; 
    if ((node as CallExpression).typeParameters) {
      return unionUtils.UnionType((node as CallExpression).typeParameters.params)
    }

    let buildASTRequire = t.tsUnknownKeyword()
    try {
      buildASTRequire = generateTsTypeMaps[callee.type]?.(callee, path);
      if (!buildASTRequire && callee.propert) {
        buildASTRequire = esRender.renderESGeneric(callee.property)
      }
    } catch(err) {
      buildASTRequire = esRender.renderESGeneric(callee.property)
    }

    return buildASTRequire || t.tsUnknownKeyword()
  },
  AssignmentExpression(node: UnionFlowType<TSType, "CallExpression">, path) {
    return generateTsTypeMap[node.right?.type]?.(node?.right, path)
  },
  /**
   * @description as 断言
   */
  TSAsExpression(node: TSType) {
    return node.typeAnnotation
  },
  ConditionalExpression(node: UnionFlowType<Node, 'ConditionalExpression'>, path) {
    const { consequent, alternate } = node

    return unionUtils.IntegrateTSTypeToUnionType([generateTsTypeMap[consequent.type]?.(consequent, path), generateTsTypeMap[alternate.type]?.(alternate, path)])
  },
  UnaryExpression(node: UnionFlowType<Node, 'UnaryExpression'>, path) {
    const { operator } = node

    if (operator === 'void') {
      return t.tsVoidKeyword()
    }
  }
};

// 联合类型
const baseTsAstMaps: string[] = [
  "BooleanLiteral",
  "NumberLiteral",
  "NumericLiteral",
  "StringLiteral",
  "NumberTypeAnnotation",
  "StringTypeAnnotation",
  "BooleanTypeAnnotation",
  "UnionTypeAnnotation",
  'undefined'
];

// 对既有TSAst数据进行操作
const curdGenerateTsAstMap = {
  ObjectTypeAnnotation: (
    node: UnionFlowType<Node, "ObjectTypeAnnotation">,
    value: ObjectTypeProperty[] | ObjectTypeSpreadProperty[]
  ) => {
    const { properties } = node;
    node.properties = properties.concat(value);
    return node;
  },
  // 基础类型转换成联合类型
  BaseTypeUnionAnnotation: (
    node: TSType | TSType[],
    value: TSType | TSType[]
  ): t.TSUnionType => {
    return t.tsUnionType((Array.isArray(node) ? node : [node]).concat(value));
  },
};

export const generateTsTypeMaps: KeyofObject<typeof generateTsTypeMap> =
  generateTsTypeMap;
export const curdGenerateTsAstMaps: KeyofObject<typeof curdGenerateTsAstMap> =
  curdGenerateTsAstMap;
export { baseTsAstMaps };
