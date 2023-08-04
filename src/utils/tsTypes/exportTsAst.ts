import * as t from "@babel/types";
import fs from "../../core/fs";
import ExportDeclarationVisitor from "../../core/visitors/ExportDeclaration";
import utils from "..";
import ExportTsTypesMap from "./exportTsTypesMap";

export default function (object, property, path) {
  if (t.isIdentifier(object)) {
    const identifierPath = path.scope.getBinding(object.name).identifier;
    const typeAnnotation = identifierPath.typeAnnotation?.typeAnnotation;

    if (typeAnnotation) {
      const isReference = t.isTSTypeReference(typeAnnotation);
      if (isReference) {
        const identifierName = (typeAnnotation.typeName as t.Identifier)?.name;
        const referencePath = path.scope.getAllBindings()[identifierName];
        const importPath = referencePath.path.parent?.source.value;
        const content = fs.getFsContent(fs.getResolvePath(importPath));
        const exportIndentiferNode =
          globalThis.exportsIndentifer[identifierName];
        if (exportIndentiferNode) {
          const typeAnnotation = ExportTsTypesMap[exportIndentiferNode.type]?.(
            exportIndentiferNode,
            property
          );
          if (typeAnnotation) {
            return typeAnnotation;
          }
        } else {
          if (content) {
            utils.transformAST(
              // @ts-ignore
              ExportDeclarationVisitor(identifierName),
              content
            );
          }

          const exportIndentiferNode =
            globalThis.exportsIndentifer[identifierName];
          if (exportIndentiferNode) {
            const typeAnnotation = ExportTsTypesMap[
              exportIndentiferNode.type
            ]?.(exportIndentiferNode, property);
            if (typeAnnotation) {
              return typeAnnotation;
            }
          }
        }
      }

      return typeAnnotation;
    }

    const referencePath = path.scope.getAllBindings()[object.name];
    if (referencePath.kind === "module") {
      const importPath = referencePath.path.parent?.source.value;
      const content = fs.getFsContent(fs.getResolvePath(importPath));

      const exportIndentiferNode =
      globalThis.exportsIndentifer[object.name];
      if (exportIndentiferNode) {
        const typeAnnotation = ExportTsTypesMap[exportIndentiferNode.type]?.(
          exportIndentiferNode,
          property,
          path
        );
        if (typeAnnotation) {
          return typeAnnotation;
        }
      } else if (content) {
        utils.transformAST(
          // @ts-ignore
          ExportDeclarationVisitor(object.name),
          content
        );

        const exportIndentiferNode = globalThis.exportsIndentifer[object.name];
        if (exportIndentiferNode) {
          const typeAnnotation = ExportTsTypesMap[exportIndentiferNode.type]?.(
            exportIndentiferNode,
            property,
            path
          );
          if (typeAnnotation) {
            return typeAnnotation;
          }
        }
      }
    }
  }
}
