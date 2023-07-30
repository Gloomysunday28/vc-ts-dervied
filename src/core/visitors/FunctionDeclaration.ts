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
    tsTypeAnotation = tsTypeAnotation.map(anotation => {
      if (t.isTSTypeAnnotation(anotation)) {
        return (anotation as t.TSTypeAnnotation).typeAnnotation
      } else {
        return anotation
      }
    })
  } else if (t.isTSTypeAnnotation(tsTypeAnotation)) {
    tsTypeAnotation = (tsTypeAnotation as t.TSTypeAnnotation).typeAnnotation
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
  const tsAstTypes: FlowType[] = [];
  const { body, async, id } = path.node;
  const returnAstNode = handleTsAst.ReturnStatement(body);
  let typeReference: { content: string; type: string };
  if (returnAstNode.length) {
    returnAstNode?.forEach((returnAstNode) => {
      try {
        const { argument } = returnAstNode || {};
  
        if (t.isIdentifier(argument)) {
          const bindScopePath = path.scope.bindings[argument.name];
          const returnTypeReference = typePromiseOrAnnotation(
            handleTsAst.Identifier(bindScopePath, tsAstTypes),
            async
          );
  
          typeReference = {
            content: generate.default(returnTypeReference).code,
            type: returnTypeReference.typeAnnotation.type,
          };
        } else {
          const returnTypeReference = typePromiseOrAnnotation(
            argument?.type
              ? generateTsTypeMaps[argument.type]?.(argument, path)
              : t.tsVoidKeyword(),
            async
          );
          typeReference = {
            content: generate.default(returnTypeReference).code,
            type: returnTypeReference?.typeAnnotation?.type || "unknown",
          };
        }
  
        if (typeReference) {
          const { node } = path;
          bullet.addDecorateBullet({
            ...typeReference,
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
        path.skip();
      } catch (err) {
        unknownRender.getUnkonwnTSType(path, async);
        path.skip();
      }
    });
  } else {
    unknownRender.getUnkonwnTSType(path, async, 'void');
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
