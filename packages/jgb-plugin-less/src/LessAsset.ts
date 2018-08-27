import CssAsset from 'jgb-plugin-css/lib/CssAsset';
import { safeLocalRequire } from 'jgb-shared';
import * as Less from 'less';
import { promisify } from 'util';

export default class LessAsset extends CssAsset {
  async parse(code: string) {
    // less should be installed locally in the module that's being required

    const less = await safeLocalRequire('less', this.name, () => Less);
    const render = promisify(less.render.bind(less));

    const opts =
      (await this.getConfig(['.lessrc', '.lessrc.js'], {
        packageKey: 'less'
      })) || {};
    opts.filename = this.name;
    opts.plugins = (opts.plugins || []).concat(urlPlugin(this));

    const lessAst = await render(code, opts);

    return await super.parse(lessAst.css || '');
  }

  async generate() {
    const { code, ext } = await super.generate();

    return {
      code,
      ext: LessAsset.outExt || ext
    };
  }
}

function urlPlugin(asset: LessAsset) {
  return {
    install: (less: any, pluginManager: any) => {
      const visitor = new less.visitors.Visitor({
        visitUrl: (node: any) => {
          if (!ignoreDependency(node.value.value)) {
            node.value.value = asset.addURLDependency(
              node.value.value,
              node.currentFileInfo.filename
            );
          }
          return node;
        }
      });

      visitor.run = visitor.visit;
      pluginManager.addVisitor(visitor);
    }
  };
}

function ignoreDependency(value: string) {
  if (value.startsWith('data:')) {
    return true;
  }

  return false;
}
