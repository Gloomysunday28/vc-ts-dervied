/* eslint-disable */
// @ts-nocheck
import * as t from '@babel/types';
import { UnionFlowType } from '../../interface';

export default {
  getClassParentPath(path) {
    let parentPath = path;

    while(parentPath) {
      if (parentPath?.node?.type === 'ClassDeclaration') {
        return parentPath;
      }
      parentPath = parentPath.parentPath;
    }
  },
  getProgramPath(path) {
    let parentPath = path;

    while(parentPath) {
      if (parentPath?.node?.type === 'Program') {
        return parentPath;
      }
      parentPath = parentPath.parentPath;
    }
  },
  getClassPropsAndState(path) {
    const classDeclarationPath = this.getClassParentPath(path);

    if (classDeclarationPath) {
      const { superTypeParameters } = classDeclarationPath.node;
      
      const [props, state] = superTypeParameters?.params || [];
      let propsTSType
      let stateTSType
      if ((props && t.isIdentifier(props.typeName)) || (state && t.isIdentifier(state))) {
        this.getProgramPath(path).traverse({
          'TSInterfaceDeclaration|TSTypeAliasDeclaration': path => {
            const { node } = path
            const { id } = node

            if (id?.name === props.typeName?.name) {
              propsTSType = node
              path.skip()
            } else if (id?.name === state.typeName?.name) {
              stateTSType = node
              path.skip()
            } else {
              path.skip()
            }
          }
        })
      }
      return {
        props: propsTSType,
        state: stateTSType
      };
    }
  },
  getPropsAndStateMemberExpression(node, path) {
    let { object, property } = node
    const keys = []
   
    while (t.isMemberExpression(object)) {
      keys.unshift(property.name)
      property = object.property
      object = object.object
    }

    return  {
      object: object,
      property,
      keys
    }
  },
  getTSPropertySignatureTypeAnnotation(typeAnnotation, keys: string[]) {
    let { members = [] } = typeAnnotation

    let keyName = keys.shift()
    let tsType
    if (keyName) {
      while(keyName) {
        tsType = members?.find(member => member?.key?.name === keyName)
        members = tsType?.typeAnnotation?.typeAnnotation?.members || []
        keyName = keys.shift()
      }
      if (tsType) {
        return tsType.typeAnnotation.typeAnnotation
      }
    } else {
      return typeAnnotation
    }
  },
  getReactMemberExpression(node: UnionFlowType<t.Node, 'MemberExpression'>, path) {
    const { property, object, keys } = this.getPropsAndStateMemberExpression(node, path);
    if (object.property?.name === 'props' || property?.name === 'props' || object.property?.name === 'state' || property?.name === 'state') {
      const { props, state } = globalThis.reactPropsAndState || {}

      if (props) {
        const { body: { body = [] }} = props
        const tsType = body.find(tsTypeParam => tsTypeParam?.key?.name ===  (property?.name === 'props' ? globalThis?.returnStatement?.argument?.name : property.name))
        const objectTsType = body.find(tsTypeParam => globalThis?.returnStatement?.argument?.properties?.some(argu => argu?.key?.name === tsTypeParam?.key?.name))
        if (tsType) {
          return tsType.typeAnnotation.typeAnnotation
        }

        if (objectTsType) {
          return objectTsType.typeAnnotation.typeAnnotation
        }
      }

      if (state) {
        const { body: { body = [] }} = state
        const key = keys.shift()
        const tsType = body.find(tsTypeParam => tsTypeParam?.key?.name === (key || (property?.name === 'state' ? globalThis?.returnStatement?.argument?.name : property.name)))
        const objectTsType = body.find(tsTypeParam => globalThis?.returnStatement?.argument?.properties?.some(argu => argu?.key?.name === tsTypeParam?.key?.name))
        const arrayTsType = body.find(tsTypeParam => globalThis?.arrayExpressionElement?.name === tsTypeParam?.key?.name);
        if (tsType) {
          return this.getTSPropertySignatureTypeAnnotation(tsType.typeAnnotation.typeAnnotation, keys)
        }
        if (objectTsType) {
          return objectTsType.typeAnnotation.typeAnnotation
        }
        if (arrayTsType) {
          return arrayTsType.typeAnnotation.typeAnnotation
        }
      }
    }
  }
};