import traverse from '@babel/traverse';

export const traverseAst = (ast, visitors) => {
  traverse(ast, visitors);
};
