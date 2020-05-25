import * as rimraf from 'rimraf';
import { getJGBConfig } from '../config';

export default async function clean(command: any = {}) {
  const config = await getJGBConfig(command.config);

  if (!config) {
    return;
  }

  const cacheDir = config.cacheDir || '.cache';
  const distDir = config.outDir || 'dist';
  const cleanCache = command.withCache;
  const cleanDir = [cleanCache && cacheDir, distDir].filter(
    (dir) => typeof dir === 'string'
  );

  console.log(`clean  ${cleanDir.map((dir) => `[${dir}]`).join(' , ')} ...`);

  const cleanTask = cleanDir.map(
    (dir) => new Promise((resolve) => rimraf(dir, resolve))
  );
  await Promise.all(cleanTask);
}
