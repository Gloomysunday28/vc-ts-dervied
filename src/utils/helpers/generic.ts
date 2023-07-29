import stringUtils from './string'

export default {
  AsyncGeneric(generic: string, async: boolean): string {
    return `${async ? 'Promise<' : ''}${stringUtils.uppcase(generic)}${async ? '>' : ''}`;
  }
};