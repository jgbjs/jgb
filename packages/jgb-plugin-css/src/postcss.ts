import loadPlugins from '@jgbjs/shared/lib/utils/loadPlugins';
import localRequire from '@jgbjs/shared/lib/utils/localRequire';
import * as postcss from 'postcss';
import * as semver from 'semver';
import CssAsset from './CssAsset';

export default async function(asset: CssAsset) {
  const config = await getConfig(asset);
  if (!config) {
    return;
  }

  await asset.parseIfNeeded();
  const res = await postcss(config.plugins).process(asset.getCSSAst(), config);

  asset.ast.css = res.css;
  asset.ast.dirty = false;
}

async function getConfig(asset: CssAsset) {
  let config = await asset.getConfig(
    ['.postcssrc', '.postcssrc.js', 'postcss.config.js'],
    { packageKey: 'postcss' }
  );

  const enableModules = false;

  if (!config) {
    return;
  }

  config = config || {};

  if (typeof config !== 'object') {
    throw new Error('PostCSS config should be an object.');
  }

  let postcssModulesConfig = {
    getJSON: (filename: string, json: any) => (asset.cssModules = json)
  };

  if (config.plugins && config.plugins['postcss-modules']) {
    postcssModulesConfig = Object.assign(
      config.plugins['postcss-modules'],
      postcssModulesConfig
    );
    delete config.plugins['postcss-modules'];
  }

  config.plugins = await loadPlugins(config.plugins, asset.name);

  if (config.modules || enableModules) {
    const postcssModules = await localRequire('postcss-modules', asset.name);
    config.plugins.push(postcssModules(postcssModulesConfig));
  }

  if (asset.options.minify) {
    const [cssnano, { version }] = await Promise.all(
      ['cssnano', 'cssnano/package.json'].map(name =>
        localRequire(name, asset.name).catch(() => require(name))
      )
    );
    config.plugins.push(
      cssnano(
        (await asset.getConfig(['cssnano.config.js'])) || {
          // Only enable safe css transforms if cssnano < 4
          // See: https://github.com/parcel-bundler/parcel/issues/698
          // See: https://github.com/ben-eb/cssnano/releases/tag/v4.0.0-rc.0
          safe: semver.satisfies(version, '<4.0.0-rc')
        }
      )
    );
  }

  config.from = asset.name;
  config.to = asset.name;
  return config;
}
