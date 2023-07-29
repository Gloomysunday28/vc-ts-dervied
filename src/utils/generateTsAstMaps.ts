/* eslint-disable */
// @ts-nocheck

import type { GenerateTsAstMapsOption } from "../interface/generateTsAstMapsDto";
import type { KeyofObject, UnionFlowType } from "../interface";
import handleTsAst from "./handleTsAst";
import operator from "../utils/helpers/operator";
import type {
  ObjectTypeProperty,
  ObjectTypeSpreadProperty,
  Identifier, // JSType
  FlowType,
  Expression,
  TSTypeParameter,
  Node, // JSType
  Flow, // FlowType
  TSType, // TSType
} from "@babel/types";
import * as t from "@babel/types";

// TSType与FlowType都可以作为类型

// js类型与Ts type的影射关系

//  js类型与Flow ast映射关系 只针对该类型生成TSType
const generateTsTypeMap: {
  [key: string]: (...args: unknown[]) => Flow | Flow[] | any;
} = {
  undefined: t.voidTypeAnnotation,
  number: (node: UnionFlowType<Node, "NumberLiteral">) => {
    return node ? t.tsLiteralType(node) : t.TSNumberKeyword();
  }, // js表达式
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
      return t.TSTypeLiteral(
        properties.map(
          (propert: ObjectTypeProperty | ObjectTypeSpreadProperty) => {
            if ((propert as ObjectTypeProperty).key) {
              const tsType = t.tsPropertySignature(
                t.stringLiteral(
                  (((propert as ObjectTypeProperty).key as Identifier)?.name ||
                    (propert as ObjectTypeProperty).key) as string
                ),
                t.tsTypeAnnotation(
                  generateTsTypeMap[(propert as ObjectTypeProperty).value.type](
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
      params.map((param) => t.identifier(param.name)),
      t.tsTypeAnnotation(
        t.isIdentifier(body)
          ? handleTsAst.Identifier(path.scope.getBinding(body.name), [])
          : generateTsTypeMaps[body.type](body, path)
      )
    );
  },
  // 参数类型
  TsTypeParameterDeclaration: (params: UnionFlowType<Node, "Identifier">[]) => {
    return t.tsTypeParameterDeclaration(
      params.map((param) => {
        const type = (
          param?.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">
        )?.typeAnnotation;
        return t.tsTypeParameter(
          type || t.tsUnknownKeyword(),
          null,
          param.name
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
    if (t.isIdentifier(object)) {
      const identifierPath = path.scope.getBinding(object.name).identifier;
      const typeAnnotation = identifierPath.typeAnnotation?.typeAnnotation;

      if (typeAnnotation) {
        return typeAnnotation;
      }
    } 
    if (t.isIdentifier(property)) {
      const { name } = property;
      const tsType = t.tsPropertySignature(
        t.stringLiteral(name),
        t.tsTypeAnnotation(
          generateTsTypeMap[parent?.right?.type](parent.right, path, option)
        )
      );
      tsType.optional = option.optional;
      return tsType;
    } else if (property.type === "PrivateName") {
    } else {
      // expression 表达式
    }
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
  BinaryExpression(node: UnionFlowType<Flow, "BinaryExpression">) {
    const referenceType = operator.operatorType(node.operator);
    return generateTsTypeMap[referenceType]?.();
  },
  LogicalExpression(node: UnionFlowType<Flow, "LogicalExpression">) {
    const referenceType = operator.operatorType(node.operator);
    return referenceType;
  },
  Identifier(node: UnionFlowType<Flow, "Identifier">, path) {
    const isBaseIdentifier = baseTsAstMaps.find(baseTSType => baseTSType.startsWith(node.name))
    if (isBaseIdentifier) {
      return generateTsTypeMap[isBaseIdentifier]()
    }
    return handleTsAst.Identifier(path.scope.getBinding(node.name), []);
  },
  CallExpression(node: UnionFlowType<Flow, "CallExpression">, path) {
    const { callee } = node;
    return generateTsTypeMap[callee.type]?.(callee, path);
  },
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
