import Asset from 'jgb-shared/lib/Asset';
import loadPlugins from 'jgb-shared/lib/utils/loadPlugins';
import * as posthtml from 'posthtml';
import * as posthtmlParse from 'posthtml-parser';

export async function parse(code: string, asset: Asset) {
  let config = await getConfig(asset);
  if (!config) {
    config = {};
  }
  config = Object.assign(
    { lowerCaseAttributeNames: false, recognizeSelfClosing: true },
    config
  );
  return posthtmlParse(code, config);
}

export async function transform(asset: Asset) {
  const config = await getConfig(asset);
  if (!config) {
    return;
  }

  await asset.parseIfNeeded();
  const containsAst = !!asset.ast;
  const res = await posthtml(config.plugins).process(
    containsAst ? asset.ast : asset.contents,
    Object.assign(config, { skipParse: containsAst })
  );

  asset.ast = res.tree;
  // asset.isAstDirty = true;
}

export async function getConfig(asset: Asset) {
  let config = await asset.getConfig(
    ['.posthtmlrc', '.posthtmlrc.js', 'posthtml.config.js'],
    {
      packageKey: 'posthtml',
    }
  );
  const { source, target } = asset.options;
  // 但两个都指定值且不相同时
  const shouldAddTransform = source && target && source !== target;

  config = config || {};
  const plugins = config.plugins || [];
  if (Array.isArray(plugins)) {
    if (shouldAddTransform) {
      plugins.push([
        'posthtml-transform-miniprogram',
        {
          source,
          target,
        },
      ]);
    }
  } else if (typeof plugins === 'object') {
    if (shouldAddTransform) {
      plugins['posthtml-transform-miniprogram'] = {
        source,
        target,
      };
    }
    // This is deprecated in favor of result messages but kept for compatibility
    // See https://github.com/posthtml/posthtml-include/blob/e4f2a57c2e52ff721eed747b65eddf7d7a1451e3/index.js#L18-L26
    const depConfig = {
      addDependencyTo: {
        addDependency: (name: any) =>
          asset.addDependency(name, { includedInParent: true }),
      },
    };
    Object.keys(plugins).forEach((p) => Object.assign(plugins[p], depConfig));
  }
  config.plugins = await loadPlugins(plugins, asset.name);
  config.skipParse = true;
  config.from = asset.name;
  config.to = asset.name;
  return config;
}
