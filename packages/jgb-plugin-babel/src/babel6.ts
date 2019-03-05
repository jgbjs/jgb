import { localRequire } from '@jgbjs/shared/lib';
import { babel6toBabel7 } from './astConverter';

export default async function babel6(asset, options: any = {}) {
  let babel = await localRequire('babel-core', asset.name);

  let config = options.config;
  config.code = false;
  config.ast = true;
  config.filename = asset.name;
  config.babelrc = false;
  config.parserOpts = Object.assign({}, config.parserOpts, {
    allowReturnOutsideFunction: true,
    allowHashBang: true,
    ecmaVersion: Infinity,
    strictMode: false,
    sourceType: 'module',
    locations: true
  });

  // Passing a list of plugins as part of parserOpts seems to override any custom
  // syntax plugins a user might have added (e.g. decorators). We add dynamicImport
  // using a plugin instead.
  config.plugins = (config.plugins || []).concat(dynamicImport);
  const contents = asset.outputCode || asset.contents;
  let res = babel.transform(contents, config);
  if (res.ast) {
    asset.ast = babel6toBabel7(res.ast);
    asset.isAstDirty = true;
  }
}

function dynamicImport() {
  return {
    manipulateOptions(opts, parserOpts) {
      parserOpts.plugins.push('dynamicImport');
    }
  };
}
