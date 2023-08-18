import reactTsAst from "../tsTypes/react";
import { generateTsTypeMaps } from '../../utils/tsTypes/generateTsAstMaps'
import exportTsAst, { traverseProgram } from "../tsTypes/exportTsAst";
import * as t from "@babel/types";

function getTSInterface(keys, path) {
  const memberTS = generateTsTypeMaps.Identifier(t.identifier(keys?.[0]), path, {
    member: keys?.[1] ? t.identifier(keys?.[1]) : void 0
  });
  return memberTS;
}

const variableReact = (keys: string[], path, keyName, isVariableDeclarator?: boolean) => {
  let typeName = getTSInterface(keys, path);
  let isTSTypeLiteral = false;
  const tKeys = keys.concat(keyName);
  
  if (!isVariableDeclarator) { // 是否是直接赋值， 若是的话typeName即是最后的结果
    if (t.isTSTypeLiteral(typeName)) {
      isTSTypeLiteral = true;
      const { members } = typeName;
      typeName = members.find(m => ((m as t.TSPropertySignature)?.key as t.Identifier).name === (keys?.[2] || keyName))?.typeAnnotation?.typeAnnotation;
    } else if (t.isTSInterfaceDeclaration(typeName)) {
      const { body: { body } } = typeName;
      typeName = body.find(m => ((m as t.TSPropertySignature)?.key as t.Identifier).name === (keys?.[2] || keyName))?.typeAnnotation?.typeAnnotation;
    }
  } else {
    isTSTypeLiteral = true;
  }

  let index = isTSTypeLiteral ? 2 : 1;

  let programeTS = typeName?.typeName ? traverseProgram(
    path,
    typeName?.typeName?.name,
    t.identifier(keys[index]),
    keys?.[index + 1] ? t.identifier(keys[index + 1]) : void 0
  ) : typeName;
  if (programeTS) {
    while (index < keys.length) {
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
        programeTS = members?.find(m => tKeys.includes(m?.key?.name))?.typeAnnotation?.typeAnnotation;
      }
      index++;
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
