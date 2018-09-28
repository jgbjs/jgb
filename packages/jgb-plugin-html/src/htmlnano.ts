import * as htmlnano from 'htmlnano';
import * as posthtml from 'posthtml';
import HtmlAsset from './htmlAsset';

export default async function(asset: HtmlAsset) {
  await asset.parseIfNeeded();

  const htmlNanoConfig = Object.assign(
    {},
    await asset.getConfig(['.htmlnanorc', '.htmlnanorc.js'], {
      packageKey: 'htmlnano'
    }),
    {
      minifyCss: false,
      minifyJs: false,
      // some attr do not minify likt: hidden etc.
      collapseBooleanAttributes: false
    }
  );

  const res = await posthtml([htmlnano(htmlNanoConfig)]).process(asset.ast, {
    skipParse: true
  });

  asset.ast = res.tree;
}
