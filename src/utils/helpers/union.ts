import * as t from '@babel/types';

export const unionUtils = {
  UnionType(tsyTypes) {
    if (tsyTypes.length) {
      if (tsyTypes.length === 1) {
        return tsyTypes[0]
      } else {
        return {
          typeAnnotation: t.tsUnionType(tsyTypes.map(params => t.isTSTypeAnnotation(params.typeAnnotation) ? params.typeAnnotation.typeAnnotation : params.typeAnnotation)),
          isMaxSizeee: tsyTypes.find(t => t.isMaxSizeee)
        }
      }
    }
  }
}