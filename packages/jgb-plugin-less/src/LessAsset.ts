import CssAsset from 'jgb-plugin-css/lib/CssAsset';
import { safeLocalRequire } from 'jgb-shared';
import * as Less from 'less';
import urlPlugin from './urlPlugin';
import fileResolvePlugin from './fileResolvePlugin';
import { promisify } from 'util';

const importOptionReg = /@import(?:\s)+(?:\((less|css|multiple|once|inline|reference|optional)\)){0,1}/;

export default class LessAsset extends CssAsset {
  async parse(code: string) {
    // less should be installed locally in the module that's being required
    const less = await safeLocalRequire('less', this.name, () => Less);
    const render = promisify(less.render.bind(less));

    const opts =
      (await this.getConfig(['.lessrc', '.lessrc.js'], {
        packageKey: 'less',
      })) || {};
    opts.filename = this.name;
    opts.plugins = (opts.plugins || []).concat(
      // urlPlugin(this),
      fileResolvePlugin(this)
    );

    // 如果没有指定@import的importOption  默认是css
    code = code.replace(importOptionReg, (g, r1) => {
      if (!r1) {
        return `@import (css) `;
      }
      return g;
    });

    const lessAst = await render(code, opts);
    CssAsset.outExt = LessAsset.outExt;
    return await super.parse(lessAst.css || '');
  }

  async generate() {
    const { code, ext } = await super.generate();

    return {
      code,
      ext: LessAsset.outExt || ext,
    };
  }
}
