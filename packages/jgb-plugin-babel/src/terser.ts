import { minify } from 'terser';
import BabelAsset from './BabelAsset';

export default async function(asset: BabelAsset) {
  await asset.parseIfNeeded();

  // Convert AST into JS
  const source = (await asset.generate()).code;

  const customConfig = await asset.getConfig(['.uglifyrc', '.terserrc']);
  let options = {
    warnings: true,
    mangle: {
      toplevel: true
    }
  };

  if (customConfig) {
    options = Object.assign(options, customConfig);
  }

  const result = minify(source, options);

  if (result.error) {
    throw result.error;
  }

  // babel-generator did our code generation for us, so remove the old AST
  asset.ast = null;
  asset.outputCode = result.code;
  asset.isAstDirty = false;
}
