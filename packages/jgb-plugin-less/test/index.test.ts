import { FileType } from 'jgb-shared/lib/utils/preProcess';
import * as path from 'path';
import JsonAsset from '../src/LessAsset';

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
    const asset = new JsonAsset('', options);
    expect(asset.fileType === FileType.CSS).toBeTruthy();
  });

  it('no match', async () => {
    const asset = new JsonAsset('', options);
    asset.contents = `
    .page {
      .test {
        /* @if wx */
        background-color: #fff;
        /* @endif wx */
      }
    }
    `;
    await asset.preProcess();
    expect(asset.contents.includes('background-color')).toBeFalsy();
  });

  it('match', async () => {
    process.env.JGB_ENV = 'wx';
    const asset = new JsonAsset('', options);
    asset.contents = `
    .page {
      .test {
        /* @if wx */
        background-color: #fff;
        /* @endif wx */
      }
    }
    `;
    await asset.preProcess();
    expect(asset.contents.includes('background-color')).toBeTruthy();
  });
});
