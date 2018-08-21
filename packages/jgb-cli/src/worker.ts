import 'v8-compile-cache';

import Asset from 'jgb-shared/lib/Asset';
import Pipeline from './Pipeline';

let pipeline: Pipeline;

export function init(options: any) {
  pipeline = new Pipeline(options || {});
  Object.assign(process.env, options.env || {});
}

export async function run(
  asset: Asset | string,
  distPath: string,
  isWarmUp: boolean
) {
  try {
    return await pipeline.process(asset, distPath, isWarmUp);
  } catch (e) {
    e.fileName = asset instanceof Asset ? asset.name : asset;
    throw e;
  }
}
