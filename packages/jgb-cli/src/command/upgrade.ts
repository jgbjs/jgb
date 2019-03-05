import path = require('path');
import * as babel from '@babel/core';
import { log } from '@jgbjs/shared/lib/Logger';
import * as fs from 'fs-extra';
import diff = require('diff');

const cwd = process.cwd();

export async function upgrade(command: any) {
  log(`start upgrade jgb v1.x => @jgbjs v2.x`);
  await Promise.all([upgradeConfig(command), upgradePkgConfig(command)]);
}

/**
 * 更新jgb.config.js中的配置
 */
export async function upgradeConfig(command: any) {
  const configPath = path.resolve(cwd, 'jgb.config.js');
  if (fs.existsSync(configPath)) {
    const config = await fs.readFile(configPath, 'utf-8');
    const oldJson = config;

    const { code } = await babel.transformAsync(config, {
      plugins: [babelPluginUpgradeConfig]
    });

    log(`Updating jgb.config.js at ${configPath}`);

    showPatch(configPath, oldJson, code);

    if (command.write) await fs.writeFile(configPath, code);
  }
}

function babelPluginUpgradeConfig({ types }) {
  return {
    visitor: {
      Property(path) {
        const key = path.node.key.name;
        if (['presets', 'plugins'].indexOf(key) >= 0) {
          replaceValue(path.node.value);
        }
      }
    }
  };

  function replaceValue(path: any) {
    if (types.isArrayExpression(path)) {
      path.elements.forEach(e => {
        if (types.isArrayExpression(e)) {
          replaceValue(e);
        } else if (types.isLiteral(e)) {
          e.value = renameJgbConfig(e.value);
        }
      });
    }
  }
}

export async function upgradePkgConfig(command: any) {
  const configPath = path.resolve(cwd, 'package.json');
  if (fs.existsSync(configPath)) {
    const pkg = require(configPath);
    const oldJson = prettyPrint(pkg);
    let dependencies = pkg.dependencies || {};
    let devDependencies = pkg.devDependencies || {};

    dependencies = Object.keys(dependencies).reduce((obj: any, key) => {
      const replacedKey = renamePkgConfig(key);
      const o: any = {};
      if (key === replacedKey) {
        o[key] = dependencies[key];
      } else {
        o[replacedKey] = 'latest';
      }
      return Object.assign(obj, o);
    }, {});

    devDependencies = Object.keys(devDependencies).reduce((obj: any, key) => {
      const replacedKey = renamePkgConfig(key);
      const o: any = {};
      if (key === replacedKey) {
        o[key] = devDependencies[key];
      } else {
        o[replacedKey] = 'latest';
      }
      return Object.assign(obj, o);
    }, {});

    pkg.dependencies = dependencies;
    pkg.devDependencies = devDependencies;

    log(`Updating package.json at ${configPath}`);

    showPatch(configPath, oldJson, prettyPrint(pkg));

    if (command.write) await fs.writeFile(configPath, prettyPrint(pkg));
  }
}

function showPatch(filename: string, before: any, after: any) {
  console.log(
    diff.createPatch(filename, before, after, 'Before Upgrade', 'After Upgrade')
  );
  console.log('');
}

function prettyPrint(json: any) {
  return JSON.stringify(json, null, 2);
}

/**
 * jgb-plugin-css => @jgbjs/plugin-css
 * jgb-preset-babel => @jgbjs/preset-babel
 * @param name
 */
function renamePkgConfig(name: string) {
  if (name.startsWith('jgb-')) {
    return name.replace(/jgb-(.*)-(.*)/, (g, $1, $2) => {
      return `@jgbjs/${$1}-${$2}`;
    });
  }

  return name;
}

/**
 * weapp => @jgbjs/weapp
 * jgb-plugin-css => @jgbjs/css
 * @param name
 */
function renameJgbConfig(name: string) {
  if (name.includes('plugin-') || name.includes('preset-')) {
    return name.replace(/.*-plugin-(.*)/, (g, $1) => {
      return `@jgbjs/${$1}`;
    });
  }
  return `@jgbjs/${name}`;
}
