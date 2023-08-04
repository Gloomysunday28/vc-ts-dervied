export const ExportDeclarationVisitorKeyNames = 'ExportNamedDeclaration|ExportDefaultDeclaration'

export default function ExportDeclarationVisitor(identifier: string) {
  return {
    [ExportDeclarationVisitorKeyNames](path) {
      const identifierPath = path.get('declaration.id')
      if (identifierPath) {
        if (!globalThis.exportsIndentifer) {
          globalThis.exportsIndentifer = {}
        }
        globalThis.exportsIndentifer[identifier] = (identifierPath as any)?.parentPath?.node
        return path.stop()
      }
    }
  }
}