import { type BinaryExpression, LogicalExpression } from '@babel/types'
import { generateTsTypeMaps } from '../tsTypes/generateTsAstMaps';
import * as t from '@babel/types';
import { UnionFlowType } from '../../interface';
import { unionUtils } from './union';
import stringUtils from './string';

export default {
  numberOperator: ['+', '-', '*', '**', '/', '%', '&', '|', '>>', '>>>', '<<', '^', '~'],
  booleanOperator: ["==" , "===" , 'delete', "!=" , "!==" , "in" , "instanceof" , ">" , "<" , ">=" , "<=" , ",>", "!", "!!"],
  expressionOperator: ['||', '&&', '??'],
  stringOperator: ['typeof'],
  voidOperator: ["void"],
  neverOperator: ['throw'],
  operatorType(operator: BinaryExpression['operator'] | LogicalExpression['operator'], node: UnionFlowType<t.Node, 'LogicalExpression'>, path) {
    if (this.numberOperator.includes(operator)) {
      if (operator === '+') {
        const { left, right } = node;
        
        return stringUtils.uppcase(left?.type).startsWith('Str') || stringUtils.uppcase(left?.type).startsWith('Temp') || stringUtils.uppcase(right?.type).startsWith('Temp') || stringUtils.uppcase(right?.type).startsWith('Str') ? 'StringLiteral' : 'NumericLiteral';
      }
      return 'NumericLiteral';
    } else if (this.booleanOperator.includes(operator)) {
      return 'BooleanLiteral';
    } else if (this.stringOperator.includes(operator)) {
      return 'StringLiteral';
    } else if (this.voidOperator.includes(operator)) {
      return 'undefined';
    } else if (this.expressionOperator.includes(operator)) {
      if (t.isIdentifier(node.left) && node.left?.name === globalThis.returnStatement?.argument?.name) {
        return generateTsTypeMaps[node.right.type]?.(node.right, path) || t.tsUnknownKeyword()
      }
      return unionUtils.UnionType([unionUtils.GetTSType(generateTsTypeMaps[node.left.type]?.(node.left, path) || t.tsUnknownKeyword()), unionUtils.GetTSType(generateTsTypeMaps[node.right.type]?.(node.right, path) || t.tsUnknownKeyword())]);
    }
  }
};