import { EsTSUtils } from '../../es/lib-es2015';
import template from '@babel/template';
import * as t from '@babel/types';
import handleTsAst from '../../utils/handleTsAst';

export const esRender = {
  renderESGeneric(property) {
    if (EsTSUtils[property.name]) {
      const buildASTRequire = template(`
          const Generic: {
            ${EsTSUtils[property.name]()}
          } = {}
        `, {
        plugins: ['typescript']
      })?.().declarations?.[0].id.typeAnnotation.typeAnnotation
     return buildASTRequire
    }
  }
}