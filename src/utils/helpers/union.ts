import * as t from "@babel/types";
import utils from "..";

export const unionUtils = {
  GetTSType(tsType) {
    if (t.isTSTypeAnnotation(tsType)) {
      return tsType.typeAnnotation;
    } else {
      return tsType;
    }
  },
  UnionType(tsyTypes, returnMaxSizeee = true) {
    try {
      if (tsyTypes.length) {
        if (tsyTypes.length === 1) {
          return tsyTypes[0];
        } else {
          return returnMaxSizeee
            ? {
                typeAnnotation: t.tsUnionType(
                  tsyTypes.flatMap((params) =>
                    t.isTSTypeAnnotation(params.typeAnnotation)
                      ? params.typeAnnotation.typeAnnotation
                      : t.isTSUnionType(params.typeAnnotation)
                      ? params.typeAnnotation.types
                      : params.typeAnnotation || params
                  )
                ),
                isMaxSizeee: tsyTypes.find((t) => t.isMaxSizeee),
              }
            : t.tsUnionType(
                tsyTypes.flatMap((params) =>
                  t.isTSTypeAnnotation(params.typeAnnotation)
                    ? params.typeAnnotation.typeAnnotation
                    : t.isTSUnionType(params.typeAnnotation)
                    ? params.typeAnnotation.types
                    : params.typeAnnotation || params
                )
              );
        }
      }
    } catch (err) {}

    return tsyTypes;
  },
  /**
   * 整合数组各个TS类型变成联合类型
   */
  IntegrateTSTypeToUnionType(tsTypes: t.TSType[]) {
    const untionTypes = tsTypes
      .map((tsType) => {
        if (t.isTSUnionType(tsType)) {
          return tsType.types;
        } else if (t.isTSTypeAnnotation(tsType)) {
          return (tsType as t.TSTypeAnnotation).typeAnnotation;
        } else {
          return tsType;
        }
      })
      .flat(Infinity) as t.TSType[];

    return t.tsUnionType(untionTypes);
  },
};
