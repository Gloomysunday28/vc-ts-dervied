import { EsTSUtils } from '../../es/lib-es2015';
import template from '@babel/template';
import * as t from '@babel/types';
import handleTsAst from '../../utils/handleTsAst';

export const esRender = {
  renderESGeneric(property) {
    if (EsTSUtils[property.name]) {
      const buildASTRequire = template(`
          type Generic = ${EsTSUtils[property.name]()}
        `, {
        plugins: ['typescript']
      })?.().typeAnnotation;
     return buildASTRequire;
    }
  }
};