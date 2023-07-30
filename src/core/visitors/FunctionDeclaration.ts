import { generateTsTypeMaps } from "../../utils/generateTsAstMaps";
import handleTsAst from "../../utils/handleTsAst";
import {
  type FlowType,
  type TSType,
} from "@babel/types";
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
function typePromiseOrAnnotation(
  tsTypeAnotation: TSType | TSType[],
  async: boolean
) {
  if (Array.isArray(tsTypeAnotation)) {
    if (globalThis.maxSizeName) {
      tsTypeAnotation = tsTypeAnotation.map((anotation) => {
        // @ts-ignore
        if (anotation.type === 'TSUnionType') {
          // @ts-ignore
          (anotation as t.TSUnionType).types = (anotation as t.TSUnionType).types.filter(type =>  type.type !== 'TSUnionType')
          return anotation
        } else {
          if (t.isTSTypeAnnotation(anotation)) {
            return (anotation as t.TSTypeAnnotation).typeAnnotation
          } else {
            return anotation
          }
        }
      })
    } else {
      tsTypeAnotation = tsTypeAnotation.map(anotation => {
        if (t.isTSTypeAnnotation(anotation)) {
          return (anotation as t.TSTypeAnnotation).typeAnnotation
        } else {
          return anotation
        }
      })
    }
  } else  {
    if (globalThis.maxSizeName) {
      // @ts-ignore
      if (tsTypeAnotation.type === 'TSUnionType') {
        // @ts-ignore
        (tsTypeAnotation as t.TSUnionType).types = (tsTypeAnotation as t.TSUnionType).types.filter(type => type.type !== 'TSUnionType')
      }
    } else if (t.isTSTypeAnnotation(tsTypeAnotation)) {
      tsTypeAnotation = (tsTypeAnotation as t.TSTypeAnnotation).typeAnnotation
    }
  }
  return async
    ? t.tsTypeAnnotation(
      t.tsTypeReference(
        t.identifier("Promise"),
        t.tsTypeParameterInstantiation(
          Array.isArray(tsTypeAnotation) ? tsTypeAnotation : [tsTypeAnotation]
        )
      )
    )
    : t.tsTypeAnnotation(tsTypeAnotation as t.TSType);
}

const FunctionDeclaration = 'FunctionDeclaration|ArrowFunctionExpression|ClassMethod'

function traverseFunctionDeclartion(path) {
  if (path.node.returnType) {
    return path.skip();
  }
  const { body, async, id } = path.node;
  const returnAstNode = handleTsAst.ReturnStatement(body);
  try {
    if (returnAstNode.length) {
      const tsTypes = returnAstNode?.map((returnAstNode) => {
        const { argument } = returnAstNode || {};

        if (t.isIdentifier(argument)) {
          const bindScopePath = path.scope.bindings[argument.name];
          const returnTypeReference = handleTsAst.Identifier(bindScopePath, [], {
            isReturnStatement: true
          })

          const typeReference = {
            content: returnTypeReference,
            type: returnTypeReference?.typeAnnotation?.type || "unknown",
          }
          return typeReference
        } else {
          const returnTypeReference = argument?.type
            ? generateTsTypeMaps[argument.type]?.(argument, path)
            : t.tsVoidKeyword()

          const typeReference = {
            content: returnTypeReference,
            type: returnTypeReference?.typeAnnotation?.type || "unknown",
          };

          path.skip();
          return typeReference
        }
      });

      const { node } = path;
      const references = typePromiseOrAnnotation(unionUtils.UnionType(tsTypes.map(c => c.content)), async)

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
      unknownRender.getUnkonwnTSType(path, async, 'void');
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
        traverseFunctionDeclartion(path)
      }
    },
  };
}
