import { declare } from 'jgb-shared/lib';
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
  if (pluginConfig.glob) compiler.addResolveGlob(pluginConfig.glob, BabelAsset);
  return pkg.name;
}) as (compiler: any, config: any) => any;
