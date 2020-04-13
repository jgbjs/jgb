import { FileType } from 'jgb-shared/lib/utils/preProcess';
import * as path from 'path';
import CssAsset from '../src/CssAsset';

describe(`preprocess`, () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');
  const outDir = path.resolve(__dirname, './example-dist');
  const options = {
    rootDir,
    sourceDir,
    outDir,
    extensions: new Set(['.json'])
  };

  it('fileType', () => {
    const asset = new CssAsset('', options);
    expect(asset.fileType === FileType.CSS).toBeTruthy();
  });

  it('no match', async () => {
    const asset = new CssAsset('', options);
    asset.contents = `
    .page {
      /* @if wx */
      background-color: #fff;
      /* @endif wx */
    }
    `;
    await asset.preProcess();
    expect(asset.contents.includes('background-color')).toBeFalsy();
  });

  it('match', async () => {
    process.env.JGB_ENV = 'wx';
    const asset = new CssAsset('', options);
    asset.contents = `
    .page {
      /* @if wx */
      background-color: #fff;
      /* @endif wx */
    }
    `;
    await asset.preProcess();
    expect(asset.contents.includes('background-color')).toBeTruthy();
  });
});
