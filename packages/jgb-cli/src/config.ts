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

  return config;
}
