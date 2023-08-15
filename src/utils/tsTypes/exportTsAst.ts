import * as t from "@babel/types";
import fs from "../../core/fs";
import ExportDeclarationVisitor from "../../core/visitors/ExportDeclaration";
import utils from "..";
import ExportTsTypesMap from "./exportTsTypesMap";
import react from "./react";

export const getMemoryExportTypeAST = ({
  identifierName,
  property,
  path
}, isNative = false) => {
  const exportIndentiferNode = globalThis.exportsIndentifer[identifierName];
  if (exportIndentiferNode) {
    const typeAnnotation = ExportTsTypesMap[exportIndentiferNode.type]?.(
      exportIndentiferNode,
      property
    );
    if (typeAnnotation) {
      return typeAnnotation;
    } else {
      return isNative ? exportIndentiferNode : react.getDeepPropertyTSType(exportIndentiferNode, [], path);
    }
  }
};

export default function (object, property, path) {
  if (t.isIdentifier(object)) {
    const identifierPath = path.scope.getBinding(object.name)?.identifier;
    const typeAnnotation = identifierPath?.typeAnnotation?.typeAnnotation;

    if (typeAnnotation) {
      const isReference = t.isTSTypeReference(typeAnnotation);
      if (isReference) {
        const identifierName = (typeAnnotation.typeName as t.Identifier)?.name;
        const referencePath = path.scope.getAllBindings()[identifierName];
        const importPath = referencePath?.path.parent?.source.value;
        if (importPath) {
          const content = fs.getFsContent(fs.getResolvePath(importPath));
          const tsAST = getMemoryExportTypeAST({
            identifierName,
            property,
            path
          });
          if (tsAST) {
            return tsAST;
          } else {
            if (content) {
              utils.transformAST(
                // @ts-ignore
                ExportDeclarationVisitor(identifierName),
                content
              );
            }

            const tsAST = getMemoryExportTypeAST({
              identifierName,
              property,
              path
            });

            if (tsAST) {
              return tsAST;
            }
          }
          return typeAnnotation;
        } else {
          const { propsTSType } = react.getGlobalTSInterface(path, {
            typeName: {
              name: identifierName,
            },
          });

          if (propsTSType) {
            const { keys } = react.getPropsAndStateMemberExpression(
              {
                object,
                property,
              },
              false
            );
            return react.getDeepPropertyTSType(propsTSType, keys, path);
          }
        }
      }
    }

    const referencePath = path.scope.getAllBindings()[object.name];
    if (referencePath?.kind === "module") {
      const importPath = referencePath.path.parent?.source.value;
      const content = fs.getFsContent(fs.getResolvePath(importPath));

      const tsAST = getMemoryExportTypeAST({
        identifierName: object.name,
        property,
        path
      }, true);

      if (tsAST) {
        return tsAST;
      } else if (content) {
        utils.transformAST(
          // @ts-ignore
          ExportDeclarationVisitor(object.name),
          content
        );

        const tsAST = getMemoryExportTypeAST({
          identifierName: object.name,
          property,
          path
        }, true);
        if (tsAST) {
          return tsAST;
        }
      }
    }
  }
}
