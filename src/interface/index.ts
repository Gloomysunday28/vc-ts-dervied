import { Node } from '@babel/types';

export type KeyofObject<T extends Record<string, any>> = {
  [K in keyof T]: T[K]
};

// 获取FlowType里的某个类型
export type UnionFlowType<T extends Node, Key extends Node['type']> = T extends T ? Key extends T['type'] ? T : never : never;

// 判断类型
// eslint-disable-next-line @typescript-eslint/naming-convention
export function SureFlowType<T, U extends T>(params: T): params is U {
  return !!(params as U)
}

// 字符串大写
export type UppcaseCame<T extends string, L extends number = 1, U extends any[] = []> = U['length'] extends L ? T :
  T extends `${infer P}${infer Q}` ? `${Uppercase<P>}${UppcaseCame<Q, L, [...U, 1]>}` : T;

// 字符串小写
export type LowCaseCame<T extends string, L extends number = 1, U extends any[] = []> = U['length'] extends L ? T :
  T extends `${infer P}${infer Q}` ? `${Lowercase<P>}${UppcaseCame<Q, L, [...U, 1]>}` : T;
