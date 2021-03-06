import Compiler from 'jgb-shared/lib/Compiler';
import { FileType } from 'jgb-shared/lib/utils/preProcess';
import * as path from 'path';
import JsonAsset from '../src/JsonAsset';

describe('JsonAsset', () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');
  const outDir = path.resolve(__dirname, './example-dist');
  const options = {
    rootDir,
    sourceDir,
    outDir,
    extensions: new Set(['.json'])
  };
  const compiler = new Compiler(options);

  it('transform', async () => {
    const asset = new JsonAsset(path.resolve(sourceDir, 'page.json'), options);
    asset.parentCompiler = compiler;

    await asset.loadIfNeeded();
    expect(asset.contents).toContain('windows');
    await asset.getDependencies();
    expect(Object.keys(asset.ast).length).toBe(2);
    await asset.transform();
    // remove $pageOptions
    expect(Object.keys(asset.ast).length).toBe(1);
  });

  it('expandFiles', async () => {
    const asset = new JsonAsset(path.resolve(sourceDir, 'page.json'), options);
    asset.parentCompiler = compiler;

    const deps = await asset.expandFiles(
      new Set(['./comp/index']),
      // @ts-ignore
      options.extensions
    );
    expect(deps.size).toBe(1);
  });
});

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
    expect(asset.fileType === FileType.JSON).toBeTruthy();
  });

  it('no match', async () => {
    const asset = new JsonAsset('', options);
    asset.contents = `
    {
      // @if wx
      title: 'test'
      // @endif
    }
    `;
    await asset.preProcess();
    expect(asset.contents.includes('title')).toBeFalsy();
  });

  it('match', async () => {
    process.env.JGB_ENV = 'wx';
    const asset = new JsonAsset('', options);
    asset.contents = `
    {
      // @if wx
      title: 'test'
      // @endif
    }
    `;
    await asset.preProcess();
    expect(asset.contents.includes('title')).toBeTruthy();
  });
});
