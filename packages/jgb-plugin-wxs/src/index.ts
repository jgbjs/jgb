import { declare } from 'jgb-shared/lib';
// @ts-ignore
import * as pkg from '../package.json';
import WxsAsset from './WxsAsset';
const defaultExts = ['.wxs'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    WxsAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, WxsAsset);
  if (pluginConfig.glob) compiler.addResolveGlob(pluginConfig.glob, WxsAsset);
  return pkg.name;
}) as (compiler: any, config: any) => any;
