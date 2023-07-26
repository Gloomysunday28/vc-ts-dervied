/* eslint-disable */
// @ts-nocheck

import type { GenerateTsAstMapsOption } from "../interface/generateTsAstMapsDto";
import type { KeyofObject, UnionFlowType, LowCaseCame } from "../interface";
import handleTsAst, { handlePath } from "./handleTsAst";
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
const generateTsTypeMap: {
  [key: string]: (...args: unknown[]) => TSType | TSType[];
} = {
  TSNumberKeyword: t.tsNumberKeyword,
  TSStringKeyword: t.tsStringKeyword,
  TSBooleanKeyword: t.tsBooleanKeyword,
  NumericLiteral: t.tsNumberKeyword, // js表达式
  StringLiteral: t.tsStringKeyword,
  BooleanLiteral: t.tsBooleanKeyword,
  TsTypeParameterDeclaration: (params: UnionFlowType<Node, "Identifier">[]) => {
    return t.tsTypeParameterDeclaration(
      params.map((param) => {
        const type = (
          param.typeAnnotation as UnionFlowType<Node, "TSTypeAnnotation">
        ).typeAnnotation?.type;
        return type
          ? t.tsTypeParameter(
              // @ts-ignore
              t[
                (type.slice(0, 2).toLowerCase() + type.slice(2)) as LowCaseCame<
                  typeof type,
                  2
                >
              ]?.(),
              null,
              param.name
            )
          : null;
      }) as TSTypeParameter[]
    );
  },
  ObjectExpression: <
    T extends {
      init: {
        properties: Array<ObjectTypeProperty | ObjectTypeSpreadProperty>;
      };
      id: keyof Node;
    }
  >(
    node: T | ObjectTypeProperty[] | ObjectTypeSpreadProperty[],
    path
  ) => {
    if (Array.isArray(node)) {
      return node[0];
    } else {
      const {
        init: { properties },
        id: key,
      } = node;
      return t.tsParenthesizedType(
        t.tsTypeLiteral(
          properties.map((propert: ObjectTypeProperty) => {
            if ((propert as ObjectTypeProperty).key) {
              return t.tsPropertySignature(
                key as Expression,
                t.tsTypeAnnotation(
                  generateTsTypeMap[propert.value.type](node, path)
                ),
                key
              );
            }
          }) as TSTypeElement[]
        )
      );
    }
  },
  MemberExpression: (
    node: UnionFlowType<Node, "MemberExpression">,
    path: any,
    option?: GenerateTsAstMapsOption
  ) => {
    const { property } = node;
    const { parent } = path;
    if (property.type === "Identifier") {
      return t.tsPropertySignature(
        property,
        t.tsTypeAnnotation(
          generateTsTypeMap[parent.right.type](parent, path, option) as TSType
        ),
        property
      );
    } else if (property.type === "PrivateName") {
    } else {
      // expression 表达式
    }
  },
  ArrowFunctionExpression: (
    node: UnionFlowType<Flow, "ArrowFunctionExpression">,
    path,
    { tsTypes }: GenerateTsAstMapsOption
  ) => {
    const { params = [] } = node;
    const paramsType = generateTsTypeMap.TsTypeParameterDeclaration(params);

    return t.tsFunctionType(
      paramsType,
      params.map((param) => t.identifier(param.name)),
      handleTsAst.Identifier(path, tsTypes)
    );
  },
};

//  js类型与Flow ast映射关系 只针对该类型生成TSType
const generateFlowTypeMap: {
  [key: string]: (...args: unknown[]) => Flow | Flow[] | any;
} = {
  NumericLiteral: (node: UnionFlowType<Node, 'NumberLiteral'>) => {
    const { value } = node
    return value ? t.numberLiteralTypeAnnotation(value) : t.numberTypeAnnotation()
  }, // js表达式
  TSNumberKeyword: (node: UnionFlowType<Node, 'NumberLiteral'>) => {
    const { value } = node
    return value ? t.numberLiteralTypeAnnotation(value) : t.numberTypeAnnotation()
  }, // TS类型
  StringLiteral:  (node: UnionFlowType<Node, 'NumberLiteral'>) => {
    const { value } = node
    return value ? t.stringLiteralTypeAnnotation(value) : t.stringTypeAnnotation()
  },
  TemplateLiteral: (node: UnionFlowType<Node, 'NumberLiteral'>) => {
    const { value } = node
    return value ? t.stringLiteralTypeAnnotation(value) : t.stringTypeAnnotation()
  },
  TSStringKeyword: (node: UnionFlowType<Node, 'NumberLiteral'>) => {
    const { value } = node
    return value ? t.stringLiteralTypeAnnotation(value) : t.stringTypeAnnotation()
  },
  BooleanLiteral: (node: UnionFlowType<Node, 'NumberLiteral'>) => {
    const { value } = node
    return value ? t.booleanLiteralTypeAnnotation(value) : t.booleanTypeAnnotation()
  },
  TSBooleanKeyword: (node: UnionFlowType<Node, 'NumberLiteral'>) => {
    const { value } = node
    return value ? t.booleanLiteralTypeAnnotation(value) : t.booleanTypeAnnotation()
  },
  ParamterDeclaration: (params: UnionFlowType<Node, "Identifier">[]) => {
    return t.typeParameterDeclaration(
      params.map((param) =>
        t.typeParameter(
          t.typeAnnotation(
            generateFlowTypeMap[
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
        generateFlowTypeMap[
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
      returnType?: Node
    }
  ) => {
    const { params } = node;
    const paramsType = generateFlowTypeMap.ParamterDeclaration(params);
    const functionParams = generateFlowTypeMap.FunctionTypeParam(params);
    const restParams = null;

    return t.functionTypeAnnotation(
      paramsType,
      functionParams,
      restParams,
      options.returnType ? generateFlowTypeMap[options.returnType.type](options.returnType) : t.anyTypeAnnotation()
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
    let returnType
    if (
      argument &&
      (t.isFunctionExpression(argument) || t.isArrowFunctionExpression(argument)) &&
      (argument.params || []).length
    ) {
      const { body } = argument;
      const returnStatement = (body.body || []).find((param) =>
        t.isReturnStatement(param)
      );
      if (returnStatement && t.isCallExpression(returnStatement.argument)) {
          const { argument } = returnStatement
          returnType = argument.arguments?.[0]
      }
    }
    return t.objectTypeAnnotation([
      t.objectTypeProperty(
        t.stringLiteral(`new ${callee.name}`),
        generateFlowTypeMap.FunctionExpression({
          params: [],
        }, path, {
          returnType
        })
      ),
    ]);
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
      return t.objectTypeAnnotation(
        properties.map(
          (propert: ObjectTypeProperty | ObjectTypeSpreadProperty) => {
            if ((propert as ObjectTypeProperty).key) {
              return t.objectTypeProperty(
                t.stringLiteral(
                  (((propert as ObjectTypeProperty).key as Identifier)?.name ||
                    (propert as ObjectTypeProperty).key) as string
                ),
                generateFlowTypeMap[(propert as ObjectTypeProperty).value.type](
                  node,
                  path
                ),
                option?.optional ? t.variance("minus") : null
              );
            }
          }
        ) as Array<ObjectTypeProperty | ObjectTypeSpreadProperty>
      );
    }
  },
  // 箭头函数
  ArrowFunctionExpression: (
    node: UnionFlowType<Node, "ArrowFunctionExpression">,
    path: any
  ) => {
    const { body } = node;
    if (t.isIdentifier(body)) {
      const { name } = body as UnionFlowType<Node, "Identifier">;
      const bindScopePath = path.scope.bindings[name];
      return t.functionTypeAnnotation(
        null,
        [],
        null,
        handlePath(bindScopePath, [])
      );
    } else if (generateFlowTypeMap[body.type]) {
      return generateFlowTypeMap[body.type](body, path);
    }
  },
  // 对象属性
  MemberExpression: (
    node: UnionFlowType<Node, "MemberExpression">,
    path: any,
    option?: GenerateTsAstMapsOption
  ) => {
    const { property } = node;
    const { parent } = path;
    if (property.type === "Identifier") {
      const { name } = property;
      return t.objectTypeProperty(
        t.stringLiteral(name),
        generateFlowTypeMap[parent.right?.type]?.(parent, path, option),
        option?.optional ? t.variance("minus") : null
      );
    } else if (property.type === "PrivateName") {
    } else {
      // expression 表达式
    }
  },
  // 数组
  ArrayExpression: (
    node: UnionFlowType<Flow, "ArrayExpression">,
    path: any
  ) => {
    const { elements } = node;
    if (Array.isArray(elements)) {
      return t.tupleTypeAnnotation(
        (elements as Flow[])?.map((ele) => {
          if (t.isIdentifier(ele)) {
            const bindScopePath =
              path.scope.bindings[(ele as unknown as Identifier).name];
            return handleTsAst.Identifier(bindScopePath, []);
          }

          return generateFlowTypeMap[ele.type](ele, path);
        })
      );
    }

    return null;
  },
};

// 联合类型
const baseTsAstMaps: string[] = [
  "NumberTypeAnnotation",
  "StringTypeAnnotation",
  "BooleanTypeAnnotation",
  "UnionTypeAnnotation",
  "BooleanLiteral",
  "NumberLiteral",
  "StringLiteral",
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
    node: FlowType | FlowType[],
    value: FlowType | FlowType[]
  ): UnionFlowType<Node, "UnionTypeAnnotation"> => {
    return t.unionTypeAnnotation(
      (Array.isArray(node) ? node : [node]).concat(value)
    );
  },
};

export const generateTsTypeMaps: KeyofObject<typeof generateTsTypeMap> =
  generateTsTypeMap;
export const generateFlowTypeMaps: KeyofObject<typeof generateFlowTypeMap> =
  generateFlowTypeMap;
export const curdGenerateTsAstMaps: KeyofObject<typeof curdGenerateTsAstMap> =
  curdGenerateTsAstMap;
export { baseTsAstMaps };
