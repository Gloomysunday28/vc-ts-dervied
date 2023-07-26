import type { UppcaseCame } from '../interface';

export default {
  uppcase<T extends string>(str: T) {
    return <UppcaseCame<T>>`${str.slice(0, 1).toUpperCase()}${str.slice(1)}`;
  },
  padStart(str: string, prefix: string): string {
    return `${prefix || ''}${str}`;
  },
  padEnd(str: string, post: string): string {
    return `${str}${post || ''}`;
  },
  filterStr(type: string, filterStr: string, prefix?: string, postfix?: string): string {
    if (type === 'ObjectTypeAnnotation') {
      return '';
    }
    return this.padEnd(this.padStart(filterStr, prefix), postfix);
  },
};
