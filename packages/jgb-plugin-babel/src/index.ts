import { declare } from '@jgbjs/shared/lib';
// @ts-ignore
import * as pkg from '../package.json';
import BabelAsset from './BabelAsset';

const defaultExts = ['.js'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    BabelAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, BabelAsset);
  return pkg.name
});
