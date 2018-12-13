import { declare } from 'jgb-shared/lib';
// @ts-ignore
import * as pkg from '../package.json';
import htmlAsset from './htmlAsset';

const defaultExts = ['.html'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    htmlAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, htmlAsset);
  return pkg.name;
});
