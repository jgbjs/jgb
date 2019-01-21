import * as rimraf from 'rimraf';
import { getJGBConfig } from '../config';

export default async function clean(main: any = [], command: any = {}) {
  const config = await getJGBConfig(command.config);

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
