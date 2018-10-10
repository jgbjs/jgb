import * as FallBackBabel from 'babel-core';
import * as babelUtils from 'babel-core/lib/util';
import presetEnv from 'babel-preset-env';
import * as fs from 'fs';
import { safeLocalRequire } from 'jgb-shared/lib';
import * as path from 'path';
import { promisify } from 'util';
import BabelAsset from './BabelAsset';
import getTargetEngines from './getTargetEngines';

const NODE_MODULES = `${path.sep}node_modules${path.sep}`;
// tslint:disable-next-line:no-var-requires
const ENV_PLUGINS = require('babel-preset-env/data/plugins');

const JSX_EXTENSIONS: { [key: string]: boolean } = {
  '.jsx': true,
  '.tsx': true
};

const JSX_PRAGMA: { [key: string]: string } = {
  react: 'React.createElement',
  preact: 'h',
  nervjs: 'Nerv.createElement',
  hyperapp: 'h'
};

const ENV_PRESETS: {
  [key: string]: boolean;
} = {
  es2015: true,
  es2016: true,
  es2017: true,
  latest: true,
  env: true
};

async function loadPlugin(name: string, assetName: string) {
  const plugin = await safeLocalRequire(
    'babel-plugin-transform-miniprogram',
    assetName,
    () => require('babel-plugin-transform-miniprogram')
  );

  if (plugin && plugin.default) {
    return plugin.default;
  }
  return plugin;
}

export async function getConfig(asset: BabelAsset): Promise<any> {
  const config = await getBabelConfig(asset);
  if (config) {
    config.code = false;
    config.filename = asset.name;
    config.babelrc = false;

    // Hide the internal property from babel
    const internal = config.internal;
    delete config.internal;
    Object.defineProperty(config, 'internal', {
      value: internal,
      configurable: true
    });
  }
  return config;
}

export default async function babelTransform(asset: BabelAsset) {
  const config = await getConfig(asset);

  if (!config) {
    return;
  }

  await asset.parseIfNeeded();

  // If this is an internally generated config, use our internal babel-core,
  // otherwise require a local version from the package we're compiling.
  const babel = config.internal
    ? require('babel-core')
    : await safeLocalRequire('babel-core', asset.name, () => FallBackBabel);
  // const babel = FallBackBabel

  let res: any = {
    ignore: true
  };
  
  res = babel.transformFromAst(asset.ast, asset.contents, config);

  if (!res.ignored) {
    asset.ast = res.ast;
    asset.isAstDirty = true;
  }
}

async function getBabelConfig(asset: BabelAsset) {
  if (asset.babelConfig) {
    return asset.babelConfig;
  }

  // Consider the module source code rather than precompiled if the resolver
  // used the `source` field, or it is not in node_modules.
  const pkg = await asset.getPackage();
  let isSource =
    !!(pkg && pkg.source && (await Realpath(asset.name)) !== asset.name) ||
    !asset.name.includes(NODE_MODULES);

  // Try to resolve a .babelrc file. If one is found, consider the module source code.
  const babelrc = (await getBabelRc(asset, isSource)) || {
    presets: [
      await safeLocalRequire('babel-preset-env', asset.name, () =>
        require('babel-preset-env')
      )
    ],
    ignore: ['node_modules']
  };
  isSource = isSource || !!babelrc;

  const envConfig = await getEnvConfig(asset, isSource);
  const jsxConfig = await getJSXConfig(asset, isSource);

  if (babelrc) {
    babelrc.ignore = ['node_modules'].concat(babelrc.ignore || []);
    const { source, target } = asset.options;
    // 但两个都指定值且不相同时
    if (source && target && source !== target) {
      babelrc.plugins = (babelrc.plugins || []).concat([
        [
          await loadPlugin('babel-plugin-transform-miniprogram', asset.name),
          {
            SOURCE: source,
            TARGET: target
          }
        ]
      ]);
    }
  }

  // Merge the babel-preset-env config and the babelrc if needed
  if (babelrc && !shouldIgnoreBabelrc(asset.name, babelrc)) {
    if (envConfig) {
      // Filter out presets that are already applied by babel-preset-env
      if (Array.isArray(babelrc.presets)) {
        babelrc.presets = babelrc.presets.filter((preset: any) => {
          return !ENV_PRESETS[getPluginName(preset)];
        });
      }

      // Filter out plugins that are already applied by babel-preset-env
      if (Array.isArray(babelrc.plugins)) {
        babelrc.plugins = babelrc.plugins.filter((plugin: any) => {
          return !ENV_PLUGINS[getPluginName(plugin)];
        });
      }

      // Add plugins generated by babel-preset-env to get to the app's target engines.
      mergeConfigs(babelrc, envConfig);
    }

    // Add JSX config if it isn't already specified in the babelrc
    const hasReact =
      hasPlugin(babelrc.presets, 'react') ||
      hasPlugin(babelrc.plugins, 'transform-react-jsx');

    if (!hasReact) {
      mergeConfigs(babelrc, jsxConfig);
    }

    return babelrc;
  }

  // If there is a babel-preset-env config, and it isn't empty use that
  if (envConfig && (envConfig.plugins.length > 0 || jsxConfig)) {
    mergeConfigs(envConfig, jsxConfig);
    return envConfig;
  }

  // If there is a JSX config, return that
  if (jsxConfig) {
    return jsxConfig;
  }

  // Otherwise, don't run babel at all
  return babelrc;
}

function hasPlugin(arr: any[], plugin: any) {
  return Array.isArray(arr) && arr.some(p => getPluginName(p) === plugin);
}

function getPluginName(p: any) {
  return Array.isArray(p) ? p[0] : p;
}

function shouldIgnoreBabelrc(filename: string, babelrc: any) {
  // Determine if we should ignore this babelrc file. We do this here instead of
  // letting babel-core handle it because this config might be merged with our
  // autogenerated one later which shouldn't be ignored.
  const ignore = babelUtils.arrayify(babelrc.ignore, babelUtils.regexify);
  const only =
    babelrc.only && babelUtils.arrayify(babelrc.only, babelUtils.regexify);
  return babelUtils.shouldIgnore(filename, ignore, only);
}

/**
 * Finds a .babelrc for an asset. By default, .babelrc files inside node_modules are not used.
 * However, there are some exceptions:
 *   - if `browserify.transforms` includes "babelify" in package.json (for legacy module compat)
 *   - the `source` field in package.json is used by the resolver
 */
async function getBabelRc(asset: BabelAsset, isSource: boolean) {
  // Support legacy browserify packages
  const pkg = await asset.getPackage();
  const browserify = pkg && pkg.browserify;
  if (browserify && Array.isArray(browserify.transform)) {
    // Look for babelify in the browserify transform list
    const babelify = browserify.transform.find(
      (t: any) => (Array.isArray(t) ? t[0] : t) === 'babelify'
    );

    // If specified as an array, override the config with the one specified
    if (Array.isArray(babelify) && babelify[1]) {
      return babelify[1];
    }

    // Otherwise, return the .babelrc if babelify was found
    return babelify ? await findBabelRc(asset) : null;
  }

  // If this asset is not in node_modules, always use the .babelrc
  if (isSource) {
    return await findBabelRc(asset);
  }

  // Otherwise, don't load .babelrc for node_modules.
  // See https://github.com/parcel-bundler/parcel/issues/13.
  return null;
}

async function findBabelRc(asset: BabelAsset) {
  return await asset.getConfig(['.babelrc', '.babelrc.js'], {
    packageKey: 'babel'
  });
}

/**
 * Generates a babel-preset-env config for an asset.
 * This is done by finding the source module's target engines, and the app's
 * target engines, and doing a diff to include only the necessary plugins.
 */
async function getEnvConfig(asset: BabelAsset, isSourceModule: boolean) {
  // Load the target engines for the app and generate a babel-preset-env config
  const targetEngines = await getTargetEngines(asset, true);
  let targetEnv = await getEnvPlugins(targetEngines, true);
  if (!targetEnv) {
    return null;
  }

  // If this is the app module, the source and target will be the same, so just compile everything.
  // Otherwise, load the source engines and generate a babel-present-env config.
  if (!isSourceModule) {
    const sourceEngines = await getTargetEngines(asset, false);
    const sourceEnv = (await getEnvPlugins(sourceEngines, false)) || targetEnv;

    // Do a diff of the returned plugins. We only need to process the remaining plugins to get to the app target.
    const sourcePlugins = new Set(sourceEnv.map((p: any) => p[0]));
    targetEnv = targetEnv.filter((plugin: any) => {
      return !sourcePlugins.has(plugin[0]);
    });
  }

  return { plugins: targetEnv, internal: true };
}

function mergeConfigs(a: any, b: any) {
  if (b) {
    a.presets = (a.presets || []).concat(b.presets || []);
    a.plugins = (a.plugins || []).concat(b.plugins || []);
  }

  return a;
}

const envCache = new Map();

async function getEnvPlugins(targets: any, useBuiltIns = false) {
  if (!targets) {
    return null;
  }

  const key = JSON.stringify(targets);
  if (envCache.has(key)) {
    return envCache.get(key);
  }

  const plugins = presetEnv(
    {},
    { targets, modules: false, useBuiltIns: useBuiltIns ? 'entry' : false }
  ).plugins;
  envCache.set(key, plugins);
  return plugins;
}

/**
 * Generates a babel config for JSX. Attempts to detect react or react-like libraries
 * and changes the pragma accordingly.
 */
async function getJSXConfig(asset: BabelAsset, isSourceModule: boolean) {
  // Don't enable JSX in node_modules
  if (!isSourceModule) {
    return null;
  }

  const pkg = await asset.getPackage();

  // Find a dependency that we can map to a JSX pragma
  let pragma = null;
  for (const dep in JSX_PRAGMA) {
    if (
      pkg &&
      ((pkg.dependencies && pkg.dependencies[dep]) ||
        (pkg.devDependencies && pkg.devDependencies[dep]))
    ) {
      pragma = JSX_PRAGMA[dep];
      break;
    }
  }

  if (pragma || JSX_EXTENSIONS[path.extname(asset.name)]) {
    return {
      plugins: [[require('babel-plugin-transform-react-jsx'), { pragma }]],
      internal: true
    };
  }
}

// tslint:disable-next-line:no-shadowed-variable
async function Realpath(path: string) {
  const realpath = promisify(fs.realpath);
  try {
    path = await realpath(path);
  } catch (e) {
    // do nothing
  }
  return path;
}
