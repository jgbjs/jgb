import { FileType } from 'jgb-shared/lib/utils/preProcess';
import * as path from 'path';
import HTMLAsset from '../src/htmlAsset';

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
    const asset = new HTMLAsset('', options);
    expect(asset.fileType === FileType.HTML).toBeTruthy();
  });

  it('no match', async () => {
    const asset = new HTMLAsset('', options);
    asset.contents = `
    <view>
    <!-- @if wx -->
    <text></text>
    <!-- @endif -->
    </view>
    }
    `;
    await asset.preProcess();
    expect(asset.contents.includes('text')).toBeFalsy();
  });

  it('match', async () => {
    process.env.JGB_ENV = 'wx';
    const asset = new HTMLAsset('', options);
    asset.contents = `
    <view>
    <!-- @if wx -->
    <text></text>
    <!-- @endif -->
    </view>
    `;
    await asset.preProcess();
    expect(asset.contents.includes('text')).toBeTruthy();
  });
});
