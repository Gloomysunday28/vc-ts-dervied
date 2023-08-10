import * as t from '@babel/types';

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

      if (props && t.isIdentifier(props.typeName)) {
        const reference = this.getProgramPath(path)?.scope.globals?.[props.typeName.name];

        reference;
      }
      return {
        props: superTypeParameters?.params?.[0],
        state: superTypeParameters?.params?.[1],
      };
    }
  }
};