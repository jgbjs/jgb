import { declare } from 'jgb-shared/lib';
import htmlAsset from './htmlAsset';

const defaultExts = ['.html'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    htmlAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, htmlAsset);
});
