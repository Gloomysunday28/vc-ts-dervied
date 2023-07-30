import * as t from '@babel/types';

export const unionUtils = {
  UnionType(tsyTypes) {
    if (tsyTypes.length) {
      if (tsyTypes.length === 1) {
        return tsyTypes[0]
      } else {
        return t.tsUnionType(tsyTypes.map(params => t.isTSTypeAnnotation(params) ? params.typeAnnotation : params))
      }
    }
  }
}