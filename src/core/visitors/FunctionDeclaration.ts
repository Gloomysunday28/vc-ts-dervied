import { generateTsTypeMaps } from "../../utils/generateTsAstMaps";
import handleTsAst from "../../utils/handleTsAst";
import {
  type FlowType,
  type TSType,
  type Node,
  type TypeAnnotation,
} from "@babel/types";
import bullet from "../render/bullet";
import * as generate from "@babel/generator";
import * as vscode from "vscode";
import * as t from "@babel/types";
import generic from "../../utils/helpers/generic";

/**
 * @description 兼容async await语法的TypeReference
 * @param tsTypeAnotation {FlowType | FlowType[]}
 * @param async boolean
 * @returns TypeAnnotation
 */
function typePromiseOrAnnotation(
  tsTypeAnotation: TSType | TSType[],
  async: boolean
) {
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

export default function () {
  return {
    "FunctionDeclaration|ArrowFunctionExpression|ClassMethod": {
      enter(path: Record<string, any>) {
        const tsAstTypes: FlowType[] = [];
        const { body, async, id } = path.node;
        const returnAstNode = handleTsAst.ReturnStatement(body);
        let typeReference: { content: string; type: string };
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
                  id?.name || path?.parent?.id?.name || "AnonymousReturnType",
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
            const { node } = path;
            bullet.addDecorateBullet({
              content: async ? ": Promise<?>" : ": ?",
              type: "?",
              name: generic.AsyncGeneric(
                id?.name || path?.parent?.id?.name || "AnonymousReturnType",
                async
              ),
              position: new vscode.Position(
                node.body.loc.start.line - 1,
                node.body.loc.start.column
              ),
            });
            path.skip();
          }
        });

        bullet;
      },
    },
  };
}
