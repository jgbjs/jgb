import { declare } from 'jgb-shared/lib';
import CssAsset from './CssAsset';

const defaultExts = ['.css'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    CssAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, CssAsset);
});
