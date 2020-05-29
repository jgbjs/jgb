import * as rimraf from 'rimraf';
import { getJGBConfig, normalizeConfig } from '../config';

export default async function clean(command: any = {}) {
  let config = await getJGBConfig(command.config);

  if (!config) {
    return;
  }

  config = normalizeConfig({
    ...config,
    ...command,
  });

  const cacheDir = config.cacheDir || '.cache';
  const distDir = config.outDir || 'dist';
  const cleanDir = [cacheDir, distDir].filter((dir) => typeof dir === 'string');

  console.log(`clean  ${cleanDir.map((dir) => `[${dir}]`).join(' , ')} ...`);

  const cleanTask = cleanDir.map(
    (dir) => new Promise((resolve) => rimraf(dir, resolve))
  );
  await Promise.all(cleanTask);
}
