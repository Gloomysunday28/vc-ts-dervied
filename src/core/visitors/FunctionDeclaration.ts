import { generateTsTypeMaps } from "../../utils/generateTsAstMaps";
import handleTsAst from "../../utils/handleTsAst";
import { type FlowType, type TSType } from "@babel/types";
import bullet from "../render/bullet";
import * as generate from "@babel/generator";
import * as vscode from "vscode";
import * as t from "@babel/types";
import generic from "../../utils/helpers/generic";
import unknownRender from "../render/unknown";
import { unionUtils } from "../../utils/helpers/union";

/**
 * @description 兼容async await语法的TypeReference
 * @param tsTypeAnotation {TsType | TsType[]}
 * @param async boolean
 * @returns TypeAnnotation
 */
interface TsTypeAnnotationTypePromiseOrAnnotation {
  typeAnnotation: TSType | TSType[];
  isMaxSizeee: boolean;
}
function typePromiseOrAnnotation(
  tsTypeAnotation: TsTypeAnnotationTypePromiseOrAnnotation,
  async: boolean
) {
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
      annotation = tsTypeAnotation
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

const FunctionDeclaration =
  "FunctionDeclaration|ArrowFunctionExpression|ClassMethod|ObjectMethod";

function traverseFunctionDeclartion(path) {
  if (path.node.returnType) {
    return path.skip();
  }
  const { body, async, id } = path.node;
  const returnAstNode = handleTsAst.ReturnStatement(body, path);
  try {
    if (returnAstNode.length) {
      const tsTypes = returnAstNode?.map((returnAstNode) => {
        try {
          const { argument } = returnAstNode || {};

          if ((returnAstNode as any).bulletTypeAnnotation) {
            return {
              content: (returnAstNode as any).bulletTypeAnnotation,
              type: (returnAstNode as any).bulletTypeAnnotation.type
            };
          }

          if (t.isIdentifier(argument)) {
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

            path.skip();
            return typeReference;
          }
        } catch (err) {
          unknownRender.getUnkonwnTSType(path, async);
        }
      });

      const { node } = path;
      const references = typePromiseOrAnnotation(
        unionUtils.UnionType(tsTypes.map((c) => c.content)),
        async
      );

      if (tsTypes.length && references) {
        bullet.addDecorateBullet({
          ...tsTypes?.[0],
          content: generate.default(references).code,
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
    path.skip();
  }
}

export default function () {
  return {
    [FunctionDeclaration]: {
      enter: (path) => {
        traverseFunctionDeclartion(path);
      },
    },
  };
}
