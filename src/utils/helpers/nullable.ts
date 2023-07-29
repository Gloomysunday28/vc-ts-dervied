export default {
  isVoid(param: any): boolean {
    return Object.prototype.toString.call(param) === '[object Undefined]';
  }
};
