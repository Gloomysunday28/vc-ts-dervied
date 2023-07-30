import { EsTSUtils } from '../../es/lib-es2015';
import template from '@babel/template';

export const esRender = {
  renderESGeneric(callee) {
    let buildASTRequire = void 0;
    if (EsTSUtils[callee.property.name]) {
      buildASTRequire = template(`
          const Generic: {
            ${EsTSUtils[callee.property.name]()}
          } = {}
        `, {
        plugins: ['typescript']
      })?.().declarations?.[0].id.typeAnnotation.typeAnnotation
    }

    return buildASTRequire
  }
}