interface FormatterOptions {
  reg: ReturnType<typeof RegExp>;
  prefix?: string;
  postfix?: string;
  replacePrefix?: string
  format?: string;
}

class Format {
  /**
   * @description 格式化对应类型的数据
   * @param str string
   * @param obj Record<string, any>
   * @returns string
   */
  formatCode(str: string, options: FormatterOptions): string;
  formatCode(obj: Record<string, any>, options: FormatterOptions): string;
  formatCode(str, options) {
    switch (typeof str) {
      case "string":
        return this.formatString(str, options);
      case "object":
        break;
      default:
        break;
    }
  }

  /**
   * @description 格式化字符串数据
   * @param str string
   * @params options FormatterOptions
   * @returns string
   */
  formatString(str: string, options: FormatterOptions): string;
  formatString(str, options) {
    const formatterRegular = options.format;
    const prefix = `${options.prefix || ""}${formatterRegular}`;
    return (
      prefix +
      str.replace(options.reg,`${options.replacePrefix || ""}${formatterRegular}`) +
      `${options.postfix}`
    );
  }
}

export default new Format();
