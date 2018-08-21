import { declare } from 'jgb-shared/lib';
import BabelAsset from './BabelAsset';

const defaultExts = ['.js'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    BabelAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, BabelAsset);
});
