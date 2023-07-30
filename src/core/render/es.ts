import { EsTSUtils } from '../../es/lib-es2015';
import template from '@babel/template';

export const esRender = {
  renderESGeneric(property) {
    let buildASTRequire = void 0;
    if (EsTSUtils[property.name]) {
      buildASTRequire = template(`
          const Generic: {
            ${EsTSUtils[property.name]()}
          } = {}
        `, {
        plugins: ['typescript']
      })?.().declarations?.[0].id.typeAnnotation.typeAnnotation
    }

    return buildASTRequire
  }
}