import { FileType } from 'jgb-shared/lib/utils/preProcess';
import * as path from 'path';
import TypeScriptAsset from '../src/TypeScriptAsset';

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
    const asset = new TypeScriptAsset('', options);
    expect(asset.fileType === FileType.JS).toBeTruthy();
  });

  it('no match', async () => {
    const asset = new TypeScriptAsset('', options);
    asset.contents = `
      /* @if wx */
      const test: number = 1;
      /* @endif wx */
    `;
    await asset.preProcess();
    expect(asset.contents.includes('test')).toBeFalsy();
  });

  it('match', async () => {
    process.env.JGB_ENV = 'wx';
    const asset = new TypeScriptAsset('', options);
    asset.contents = `
    /* @if wx */
    const test: number = 1;
    /* @endif wx */
    `;
    await asset.preProcess();
    expect(asset.contents.includes('test')).toBeTruthy();
  });
});
