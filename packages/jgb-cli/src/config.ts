import * as fs from 'fs';
import { Config, IInitOptions } from 'jgb-shared/lib';

export function loadConfig(fileName: string) {
  if (fs.existsSync(fileName)) {
    return require(fileName);
  }

  return null;
}

export async function getJGBConfig(configName?: string) {
  const findArr = ['jgb.config.js'];
  if (configName) {
    findArr.unshift(configName);
  }

  const config = (await Config.load(process.cwd(), findArr)) as IInitOptions;

  try {
    const tsConfig = await getTsConfig();
    if (tsConfig?.compilerOptions?.paths) {
      const paths = processPaths(tsConfig.compilerOptions.paths);
      config.alias = Object.assign({}, paths, config.alias);
    }
  } catch (error) {
    console.log('getTsConfig errror:', error);
  }

  return config;
}

export function normalizeConfig(config: IInitOptions) {
  config.source = config.target || 'wx';
  config.target = config.target || 'wx';
  config.cacheDir = config.cacheDir || `.cache/${config.target}`;
  config.sourceDir = config.sourceDir || `src`;
  config.outDir = config.outDir || `dist`;
  config.npmDir = config.npmDir || 'node_modules';

  return config;
}

/**
 * 处理paths
 */
function processPaths(paths: any) {
  Object.keys(paths).forEach((key) => {
    const value = paths[key] as string[];
    // 忽略 .d.ts
    if (value.some((v) => v.includes('.d.ts'))) {
      delete paths[key];
      return;
    }
    // 忽略types
    if (value.some((v) => v.includes('node_modules/@types'))) {
      delete paths[key];
      return;
    }
    // add relative path
    paths[key] = value.map((v) => {
      if (v.startsWith('.') || v.startsWith('/')) {
        return v;
      }
      return `./${v}`;
    });
  });
  return paths;
}

async function getTsConfig(): Promise<{
  compilerOptions: {
    paths?: {
      [alias: string]: string[];
    };
  };
}> {
  return Config.load(process.cwd(), ['tsconfig.json']);
}
