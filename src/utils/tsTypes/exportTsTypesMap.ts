import type { UnionFlowType } from "../../interface";
import type { TSType, Node } from '@babel/types'

export default {
  TSInterfaceDeclaration(node: UnionFlowType<TSType, 'TSInterfaceDeclaration'>, property: Node) {
    const { body } = node

    // @ts-ignore
    const interfaceProperty = body.body?.find(n => n?.key?.name === property?.name)
    return interfaceProperty?.typeAnnotation?.typeAnnotation
  }
}