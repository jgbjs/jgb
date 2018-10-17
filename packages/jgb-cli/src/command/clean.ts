import { Config, IInitOptions } from 'jgb-shared/lib';
import * as rimraf from 'rimraf';

export default async function clean() {
  const config = (await Config.load(process.cwd(), [
    'jgb.config.js'
  ])) as IInitOptions;

  if (!config) {
    return;
  }

  const cacheDir = config.cacheDir || '.cache';
  const distDir = config.outDir || 'dist';

  console.log(`clean [${cacheDir}], [${distDir}] ...`);

  const rmCachePromise = new Promise(resolve => rimraf(cacheDir, resolve));
  const rmDistPromise = new Promise(resolve => rimraf(distDir, resolve));
  await Promise.all([rmCachePromise, rmDistPromise]);
}
