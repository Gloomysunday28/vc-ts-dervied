import { generateFlowTypeMaps } from "../../utils/generateTsAstMaps";
import handleTsAst from "../../utils/handleTsAst";
import { type FlowType, type Node, type TypeAnnotation } from "@babel/types";
import bullet from "../render/bullet";
import * as generate from "@babel/generator";
import * as vscode from "vscode";
import * as t from "@babel/types";

/**
 * @description 兼容async await语法的TypeReference
 * @param tsTypeAnotation {FlowType | FlowType[]}
 * @param async boolean
 * @returns TypeAnnotation
 */
function typePromiseOrAnnotation(
  tsTypeAnotation: FlowType | FlowType[],
  async: boolean,
): TypeAnnotation {
  return async
    ? t.typeAnnotation(
      t.genericTypeAnnotation(
        t.identifier("Promise"),
        t.typeParameterInstantiation(
          Array.isArray(tsTypeAnotation) ? tsTypeAnotation : [tsTypeAnotation]
        )
      )
    )
    : t.typeAnnotation(tsTypeAnotation as FlowType);
}

export default function () {
  return {
    'FunctionDeclaration|ArrowFunctionExpression|ClassMethod': {
      enter(path: Record<string, any>) {
        const tsAstTypes: FlowType[] = [];
        const { body, async, id } = path.node;
        const returnAstNode = body.body?.find((node: Node) =>
          t.isReturnStatement(node)
        );
        let typeReference: { content: string; type: string };
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
              ? generateFlowTypeMaps[argument.type]?.(argument, path)
              : t.voidTypeAnnotation(),
            async,
          );
          typeReference = {
            content: generate.default(returnTypeReference).code,
            type: returnTypeReference?.typeAnnotation?.type || 'unknown'
          };
        }

        if (typeReference) {
          const { node } = path;
          bullet.addDecorateBullet({
            ...typeReference,
            name: id?.name || 'AnonymousReturnType',
            position: new vscode.Position(
              node.body.loc.start.line - 1,
              node.body.loc.start.column
            ),
          });
        }

        path.skip();
      },
    },
  };
}
