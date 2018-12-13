import { declare } from 'jgb-shared/lib';
// @ts-ignore
import * as pkg from '../package.json';
import TypeScriptAsset from './TypeScriptAsset';

const defaultExts = ['.ts'];

export default declare((compiler, pluginConfig = {}) => {
  const exts = defaultExts.concat(pluginConfig.extensions || []);
  if (pluginConfig.outExt) {
    TypeScriptAsset.outExt = pluginConfig.outExt;
  }
  compiler.addAssetsType(exts, TypeScriptAsset);
  return pkg.name
});
