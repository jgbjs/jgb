import { declare } from 'jgb-shared/lib';
import TypeScriptAsset from './TypeScriptAsset';

const defaultExts = ['.ts'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    TypeScriptAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, TypeScriptAsset);
});
