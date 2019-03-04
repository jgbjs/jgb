import babel6 from './babel6';
import babel7 from './babel7';
import getBabelConfig from './config';

export default async function babelTransform(asset) {
  let config = await getBabelConfig(asset);

  if (config[6]) {
    await babel6(asset, config[6]);
  }

  if (config[7]) {
    await babel7(asset, config[7]);
  }

  return asset.ast;
}
