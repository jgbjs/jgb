import { declare } from 'jgb-shared/lib';
// @ts-ignore
import * as pkg from '../package.json';
import LessAsset from './LessAsset';

const defaultExts = ['.less'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    LessAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, LessAsset);
  if (pluginConfig.glob) compiler.addResolveGlob(pluginConfig.glob, LessAsset);
  return pkg.name
});
