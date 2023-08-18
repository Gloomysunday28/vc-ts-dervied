import reactTsAst from "../tsTypes/react";
import exportTsAst, { traverseProgram } from "../tsTypes/exportTsAst";
import * as t from "@babel/types";

function getTSInterface(keys, path) {
  return reactTsAst.getReactMemberExpression(
    t.memberExpression(t.identifier(keys?.[0]), t.identifier(keys?.[1])),
    path,
    keys
  );
}

const variableReact = (keys: string[], path, keyName) => {
  let typeName = getTSInterface(keys, path);
  let isTSTypeLiteral = false;
  if (t.isTSTypeLiteral(typeName)) {
    isTSTypeLiteral = true;
    typeName = typeName.members?.[0].typeAnnotation?.typeAnnotation;
  }

  let index = isTSTypeLiteral ? 2 : 1;

  let programeTS = traverseProgram(
    path,
    typeName?.typeName?.name,
    t.identifier(keys[index]),
    t.identifier(keys[index + 1])
  );
  if (programeTS) {
    if (index < keys.length) {
      // programeTS = 
      if (t.isTSTypeReference(programeTS)) {
        programeTS = traverseProgram(
          path,
          // @ts-ignore
          programeTS?.typeName?.name,
          t.identifier(keys[index + 1]),
          t.identifier(keys[index + 2])
        );
      } else if (t.isTSTypeLiteral(programeTS)) {
        const { members } = programeTS;
        // @ts-ignore
        programeTS = members?.find(m => keys.includes(m?.key?.name))?.typeAnnotation?.typeAnnotation;
      }
    }
    return t.tsPropertySignature(
      t.stringLiteral(keyName),
      t.tsTypeAnnotation(programeTS)
    );
  } else {
    const typeAnnotation = exportTsAst(
      t.identifier(keys[1]),
      t.identifier(keys[2]),
      path
    );
    if (typeAnnotation) {
      return t.tsPropertySignature(
        t.stringLiteral(keyName),
        t.tsTypeAnnotation(typeAnnotation)
      );
    }
  }
};

export default variableReact;
