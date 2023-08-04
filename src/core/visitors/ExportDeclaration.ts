import * as t from '@babel/types';
export const ExportDeclarationVisitorKeyNames = 'ExportNamedDeclaration|ExportDefaultDeclaration'

export default function ExportDeclarationVisitor(identifier: string) {
  return {
    [ExportDeclarationVisitorKeyNames](path) {
      const identifierPath = path.get('declaration.id');
      if (identifierPath) {
        const { declaration } = path.node;
        const { id } = declaration;

        if (t.isIdentifier(id) && id?.name === identifier) {
          if (!globalThis.exportsIndentifer) {
            globalThis.exportsIndentifer = {};
          }
          globalThis.exportsIndentifer[identifier] = (identifierPath as any)?.parentPath?.node;
          return path.stop();
        } else {
          return path.skip();
        }
      }
    }
  };
}