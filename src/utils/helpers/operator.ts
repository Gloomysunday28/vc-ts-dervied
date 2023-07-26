import { type BinaryExpression, LogicalExpression } from '@babel/types'
import * as t from '@babel/types'

export default {
  numberOperator: ['+', '-', '*', '**', '/', '%', '&', '|', '>>', '>>>', '<<', '^'],
  booleanOperator: ["==" , "===" , "!=" , "!==" , "in" , "instanceof" , ">" , "<" , ">=" , "<=" , ",>"],
  expressionOperator: ['||', '&&', '??'],
  operatorType(operator: BinaryExpression['operator'] | LogicalExpression['operator']) {
    if (this.numberOperator.includes(operator)) {
      return 'NumericLiteral'
    } else if (this.booleanOperator.includes(operator)) {
      return 'BooleanLiteral'
    } else if (this.expressionOperator.includes(operator)) {
      return t.anyTypeAnnotation()
    }
  }
}