import { declare } from 'jgb-shared/lib';
// @ts-ignore
import * as pkg from '../package.json';
import CssAsset from './CssAsset';

const defaultExts = ['.css'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    CssAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, CssAsset);
  if (pluginConfig.glob) compiler.addResolveGlob(pluginConfig.glob, CssAsset);
  return pkg.name;
});
