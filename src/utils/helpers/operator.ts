import { type BinaryExpression, LogicalExpression } from '@babel/types'
import { generateTsTypeMaps } from '../generateTsAstMaps';
import * as t from '@babel/types';
import { UnionFlowType } from '../../interface';
import { unionUtils } from './union';

export default {
  numberOperator: ['+', '-', '*', '**', '/', '%', '&', '|', '>>', '>>>', '<<', '^'],
  booleanOperator: ["==" , "===" , "!=" , "!==" , "in" , "instanceof" , ">" , "<" , ">=" , "<=" , ",>"],
  expressionOperator: ['||', '&&', '??'],
  operatorType(operator: BinaryExpression['operator'] | LogicalExpression['operator'], node: UnionFlowType<t.Node, 'LogicalExpression'>, path) {
    if (this.numberOperator.includes(operator)) {
      return 'NumericLiteral';
    } else if (this.booleanOperator.includes(operator)) {
      return 'BooleanLiteral';
    } else if (this.expressionOperator.includes(operator)) {
      return t.tsUnionType([unionUtils.GetTSType(generateTsTypeMaps[node.left.type]?.(node.left, path) || t.tsUnknownKeyword()), unionUtils.GetTSType(generateTsTypeMaps[node.right.type]?.(node.right, path) || t.tsUnknownKeyword())]);
    }
  }
};