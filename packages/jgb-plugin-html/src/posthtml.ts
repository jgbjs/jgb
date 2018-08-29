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
    { lowerCaseAttributeNames: true, recognizeSelfClosing: true },
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
  const res = await posthtml(config.plugins).process(asset.ast, config);

  asset.ast = res.tree;
  // asset.isAstDirty = true;
}

export async function getConfig(asset: Asset) {
  let config = await asset.getConfig(
    ['.posthtmlrc', '.posthtmlrc.js', 'posthtml.config.js'],
    {
      packageKey: 'posthtml'
    }
  );
  if (!config /* && !asset.options.minify */) {
    return;
  }

  config = config || {};
  const plugins = config.plugins;
  if (typeof plugins === 'object') {
    // This is deprecated in favor of result messages but kept for compatibility
    // See https://github.com/posthtml/posthtml-include/blob/e4f2a57c2e52ff721eed747b65eddf7d7a1451e3/index.js#L18-L26
    const depConfig = {
      addDependencyTo: {
        addDependency: (name: any) =>
          asset.addDependency(name, { includedInParent: true })
      }
    };
    Object.keys(plugins).forEach(p => Object.assign(plugins[p], depConfig));
  }
  config.plugins = await loadPlugins(plugins, asset.name);
  config.skipParse = true;
  return config;
}
