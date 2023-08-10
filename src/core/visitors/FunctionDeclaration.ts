import { generateTsTypeMaps } from "../../utils/tsTypes/generateTsAstMaps";
import handleTsAst from "../../utils/tsTypes/handleTsAst";
import { type TSType } from "@babel/types";
import bullet from "../render/bullet";
import * as generate from "@babel/generator";
import * as vscode from "vscode";
import * as t from "@babel/types";
import generic from "../../utils/helpers/generic";
import unknownRender from "../render/unknown";
import { unionUtils } from "../../utils/helpers/union";
import config from '../config';
import exportTsAst from '../../utils/tsTypes/exportTsAst';
import reactStateAndProps from '../../utils/tsTypes/react';

/**
 * @description 兼容async await语法的TypeReference
 * @param tsTypeAnotation {TsType | TsType[]}
 * @param async boolean
 * @returns TypeAnnotation
 */
interface TsTypeAnnotationTypePromiseOrAnnotation {
  typeAnnotation: TSType | TSType[];
  isMaxSizeee?: boolean;
  isJSXElement: boolean;
}
function typePromiseOrAnnotation(
  tsTypeAnotation: TsTypeAnnotationTypePromiseOrAnnotation,
  async: boolean
) {
  if (tsTypeAnotation.isJSXElement) {
    return async ? ": Promise<React.Element>" : ": React.Element";
  }
  let annotation;
  if (Array.isArray(tsTypeAnotation)) {
    annotation = tsTypeAnotation.map((anotation) => {
      if (anotation.isMaxSizeee) {
        if (anotation.type === "TSUnionType") {
          // @ts-ignore
          (anotation as t.TSUnionType).typeAnnotation.types = (
            anotation as any
          ).typeAnnotation?.types.filter((type) => type.type !== "TSUnionType");
          return anotation.typeAnnotation;
        }
      } else {
        if (t.isTSTypeAnnotation(anotation.typeAnnotation)) {
          return (anotation.typeAnnotation as t.TSTypeAnnotation)
            .typeAnnotation;
        } else {
          return anotation.typeAnnotation;
        }
      }
    });
  } else {
    annotation = tsTypeAnotation.typeAnnotation;
    if (tsTypeAnotation.isMaxSizeee) {
      // @ts-ignore
      if (annotation.type === "TSUnionType") {
        // @ts-ignore
        (annotation as t.TSUnionType).types = (
          annotation as t.TSUnionType
        ).types.filter((type) => type.type !== "TSUnionType");
      }
      // @ts-ignore
    } else if (t.isTSTypeAnnotation(tsTypeAnotation.typeAnnotation)) {
      annotation = (tsTypeAnotation.typeAnnotation as t.TSTypeAnnotation)
        .typeAnnotation;
    } else if (!annotation) {
      annotation = tsTypeAnotation;
    }
  }

  return async
    ? t.tsTypeAnnotation(
        t.tsTypeReference(
          t.identifier("Promise"),
          t.tsTypeParameterInstantiation(
            Array.isArray(annotation) ? annotation : [annotation]
          )
        )
      )
    : t.tsTypeAnnotation(annotation as t.TSType);
}

export const FunctionDeclaration =
  "FunctionDeclaration|ArrowFunctionExpression|ClassMethod|ObjectMethod";

export function getReturnBulletTypeAnnotation(returnAstNode, path, async) {
  const tsTypes = returnAstNode?.map((returnAstNode) => {
    try {
      const { argument } = returnAstNode || {};

      if ((returnAstNode as any).bulletTypeAnnotation) {
        return {
          content: (returnAstNode as any).bulletTypeAnnotation,
          type: (returnAstNode as any).bulletTypeAnnotation.type,
        };
      }

      if (t.isJSXElement(argument) || t.isJSXFragment(argument)) {
        return {
          content: {
            typeAnnotation: t.memberExpression(
              t.identifier("React"),
              t.identifier("Element")
            ),
            isJSXElement: true,
          },
          type: "JSXElment",
        };
      }

      if (t.isIdentifier(argument)) {
        const typeAnnotation =  exportTsAst(argument, argument, path);
        if (typeAnnotation) {
          return {
            content: {
              typeAnnotation,
            },
            type: 'exportIdentifier'// filterStr时使用
          };
        }
        const bindScopePath = path.scope.bindings[argument.name];
        const returnTypeReference = handleTsAst.Identifier(
          bindScopePath,
          [],
          {
            isReturnStatement: true,
          }
        );

        const typeReference = {
          content: {
            typeAnnotation: returnTypeReference,
            isMaxSizeee:
              globalThis.isMaxSizeee === bindScopePath?.identifier?.name,
          },
          type: returnTypeReference?.typeAnnotation?.type || "unknown",
        };

        globalThis.isMaxSizeee = "";
        return typeReference;
      } else {
        const returnTypeReference = argument?.type
          ? generateTsTypeMaps[argument.type]?.(argument, path, {
              isReturnStatement: true,
            })
          : t.tsVoidKeyword();

        const typeReference = {
          content: {
            typeAnnotation: returnTypeReference,
          },
          type: returnTypeReference?.typeAnnotation?.type || "unknown",
        };

        return typeReference;
      }
    } catch (err) {
      unknownRender.getUnkonwnTSType(path, async);
    }
  });

  const references = typePromiseOrAnnotation(
    unionUtils.UnionType(tsTypes.map((c) => c.content)),
    async
  );

  return {
    references,
    tsTypes
  };
}

export function traverseFunctionDeclartion(path) {
  if (config.isBlacklisted(path)) {
    return path.skip();
  }
  
  if (path.node.returnType) {
    return path.skip();
  }
  const { node } = path;
  const { body, async, id } = node;
  const returnAstNode = handleTsAst.ReturnStatement(body, path);
  try {
    if (returnAstNode.length) {
      const reactPropsAndState = reactStateAndProps.getClassPropsAndState(path);
      if (reactPropsAndState) {
        globalThis.reactPropsAndState = reactPropsAndState;
      }
      const { tsTypes, references } = getReturnBulletTypeAnnotation(returnAstNode, path, async);

      if (tsTypes.length && references) {
        bullet.addDecorateBullet({
          ...tsTypes?.[0],
          async,
          content:
            typeof references === "string"
              ? references
              : generate.default(references).code,
          name: generic.AsyncGeneric(
            id?.name || path?.parent?.id?.name || "Anonymous",
            async
          ),
          position: new vscode.Position(
            node.body.loc.start.line - 1,
            node.body.loc.start.column
          ),
        });
      }
    } else {
      unknownRender.getUnkonwnTSType(path, async, "void");
    }
  } catch (err) {
    unknownRender.getUnkonwnTSType(path, async);
    path.skip(); // 跳过子节点循环
  }
}

export default function () {
  return {
    [FunctionDeclaration]: traverseFunctionDeclartion
  };
}
