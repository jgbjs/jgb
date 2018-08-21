// import * as Browserslist from 'browserslist';
import * as Path from 'path';
import * as semver from 'semver';
import BabelAsset from './BabelAsset';

import Browserslist = require('browserslist');

const DEFAULT_ENGINES: {
  [key: string]: any;
} = {
  browsers: ['> 0.25%'],
  node: '8'
};

export default async function getTargetEngines(
  asset: BabelAsset,
  isTargetApp: boolean
) {
  const targets: any = {};
  const path = isTargetApp
    ? Path.join(asset.options.rootDir, 'index')
    : asset.name;
  const compileTarget =
    asset.options.target === 'browser' ? 'browsers' : asset.options.target;
  const pkg = await asset.getConfig(['package.json'], { path });
  const engines = pkg && pkg.engines;
  let nodeVersion = engines && getMinSemver(engines.node);

  if (compileTarget === 'node') {
    // Use package.engines.node by default if we are compiling for node.
    if (typeof nodeVersion === 'string') {
      targets.node = nodeVersion;
    }
  } else {
    if (
      engines &&
      (typeof engines.browsers === 'string' || Array.isArray(engines.browsers))
    ) {
      targets.browsers = engines.browsers;
    } else if (pkg && pkg.browserslist) {
      targets.browsers = pkg.browserslist;
    } else {
      const browserslist = await loadBrowserslist(asset, path);
      if (browserslist) {
        targets.browsers = browserslist;
      } else {
        const babelTargets = await loadBabelrc(asset, path);
        if (babelTargets && babelTargets.browsers) {
          targets.browsers = babelTargets.browsers;
        } else if (babelTargets && babelTargets.node && !nodeVersion) {
          nodeVersion = babelTargets.node;
        }
      }
    }

    // Fall back to package.engines.node for node_modules without any browser target info.
    if (!isTargetApp && !targets.browsers && typeof nodeVersion === 'string') {
      targets.node = nodeVersion;
    }
  }

  // If we didn't find any targets, set some default engines for the target app.
  if (
    isTargetApp &&
    !targets[compileTarget] &&
    DEFAULT_ENGINES[compileTarget]
  ) {
    targets[compileTarget] = DEFAULT_ENGINES[compileTarget];
  }

  // Parse browser targets
  if (targets.browsers) {
    if (
      typeof targets.browsers === 'object' &&
      !Array.isArray(targets.browsers)
    ) {
      // const env = asset.options.production
      //   ? 'production'
      //   : process.env.NODE_ENV || 'development';
      targets.browsers =
        /* targets.browsers[env] || */ targets.browsers.defaults;
    }

    if (targets.browsers) {
      targets.browsers = Browserslist(targets.browsers).sort();
    }
  }

  // Dont compile if we couldn't find any targets
  if (Object.keys(targets).length === 0) {
    return null;
  }

  return targets;
}

function getMinSemver(version: string) {
  try {
    const range = new semver.Range(version);
    const sorted = range.set.sort((a, b) => a[0].semver.compare(b[0].semver));
    return sorted[0][0].semver.version;
  } catch (err) {
    return null;
  }
}

async function loadBrowserslist(asset: BabelAsset, path: string) {
  const config = await asset.getConfig(['browserslist', '.browserslistrc'], {
    path,
    load: false
  });

  if (config) {
    return Browserslist.readConfig(config);
  }
}

async function loadBabelrc(asset: BabelAsset, path: string) {
  const config = await asset.getConfig(['.babelrc', '.babelrc.js'], { path });
  if (config && config.presets) {
    const env = config.presets.find(
      (plugin: any) =>
        Array.isArray(plugin) &&
        (plugin[0] === 'env' || plugin[0] === '@babel/env')
    );
    if (env && env[1] && env[1].targets) {
      return env[1].targets;
    }
  }
}
