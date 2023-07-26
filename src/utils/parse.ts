import { parse } from '@babel/parser';

export const parseAst = (code: string) => {
  return parse(code, {
    plugins: ["typescript", "jsx"],
    sourceType: "module",
  });
};