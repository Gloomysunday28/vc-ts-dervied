import { generateFlowTypeMaps } from "../utils/generateTsAstMaps";
import handleTsAst from "../utils/handleTsAst";
import { type FlowType, type Node } from "@babel/types";
import bullet from '../utils/bullet';
import * as generate from '@babel/generator';
import * as vscode from "vscode";
import * as t from "@babel/types";

function typePromiseOrAnnotation(
  tsTypeAnotation: FlowType | FlowType[],
  async: boolean
) {
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
    // eslint-disable-next-line @typescript-eslint/naming-convention
    FunctionDeclaration(path: Record<string, any>) {
      const tsAstTypes: FlowType[] = [];
      const { body, async } = path.node;
      const returnAstNode = body.body?.find((node: Node) =>
        t.isReturnStatement(node)
      );
      let str: vscode.SnippetString;
      const { argument } = returnAstNode || {};
      if (t.isIdentifier(argument)) {
        const bindScopePath = path.scope.bindings[argument.name];
        str = new vscode.SnippetString(generate.default(typePromiseOrAnnotation(
          handleTsAst.Identifier(bindScopePath, tsAstTypes),
          async
        )).code);
        
      } else {
        str = new vscode.SnippetString(generate.default(typePromiseOrAnnotation(
          argument?.type
            ? generateFlowTypeMaps[argument.type](argument, path)
            : t.voidTypeAnnotation(),
          async
        )).code);
      }

      // str.value = '// ' + str.value
      const { node } = path;
      bullet.addBullet({
        content: str,
        position: new vscode.Position(node.body.loc.start.line - 1, node.body.loc.start.column)
      });
    },
  };
}
