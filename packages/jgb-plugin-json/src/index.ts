import { declare } from 'jgb-shared/lib';
// @ts-ignore
import * as pkg from '../package.json';
import JsonAsset from './JsonAsset';

const defaultExts = ['.json'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    JsonAsset.outExt = pluginConfig.outExt;
  }
  JsonAsset.prototype.parentCompiler = compiler;
  compiler.addAssetsType(exts, JsonAsset);
  if (pluginConfig.glob) compiler.addResolveGlob(pluginConfig.glob, JsonAsset);
  return pkg.name;
});
