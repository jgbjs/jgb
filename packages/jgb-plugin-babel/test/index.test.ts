import { FileType } from 'jgb-shared/lib/utils/preProcess';
import * as path from 'path';
import generate from 'babel-generator';
import BabelAsset from '../src/BabelAsset';

describe(`preprocess`, () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');
  const outDir = path.resolve(__dirname, './example-dist');
  const options = {
    rootDir,
    sourceDir,
    outDir,
    extensions: new Set(['.json']),
  };

  it('fileType', () => {
    const asset = new BabelAsset('', options);
    expect(asset.fileType === FileType.JS).toBeTruthy();
  });

  it('no match', async () => {
    const asset = new BabelAsset('', options);
    asset.contents = `
      /* @if wx */
      var test = 1;
      /* @endif wx */
    `;
    await asset.preProcess();
    expect(asset.contents.includes('test')).toBeFalsy();
  });

  it('match', async () => {
    process.env.JGB_ENV = 'wx';
    const asset = new BabelAsset('', options);
    asset.contents = `
    /* @if wx */
    var test = 1;
    /* @endif wx */
    `;
    await asset.preProcess();
    expect(asset.contents.includes('test')).toBeTruthy();
  });
});

describe(`import image`, () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');
  const outDir = path.resolve(__dirname, './example-dist');
  const options = {
    rootDir,
    sourceDir,
    outDir,
    extensions: new Set(['.json']),
    alias: {},
  };

  it(`import img from './image.png' `, async () => {
    const asset = new BabelAsset('', options);
    asset.contents = `import img from './image.png'`;
    asset.name = path.resolve(sourceDir, './index.js');
    // await asset.pretransform();
    await asset.getDependencies();
    const generated: any = generate(asset.ast, {}, asset.contents);
    const code = generated.code;
    expect(code).toBe(`var img = './image.png';`);
  });

  it(`const img = require('./image.png')`, async () => {
    const asset = new BabelAsset('', options);
    asset.contents = `const img = require('./image.png')`;
    asset.name = path.resolve(sourceDir, './index.js');
    // await asset.pretransform();
    await asset.getDependencies();
    const generated: any = generate(asset.ast, {}, asset.contents);
    const code = generated.code;
    expect(code).toBe(`const img = './image.png';`);
  });

  it(`import './image.png'`, async () => {
    const asset = new BabelAsset('', options);
    asset.contents = `import './image.png'`;
    asset.name = path.resolve(sourceDir, './index.js');
    // await asset.pretransform();
    await asset.getDependencies();
    const generated: any = generate(asset.ast, {}, asset.contents);
    const code = generated.code;
    expect(code).toBe(`;`);
  });

  it(`require('./image.png')`, async () => {
    const asset = new BabelAsset('', options);
    asset.contents = `require('./image.png')`;
    asset.name = path.resolve(sourceDir, './index.js');
    // await asset.pretransform();
    await asset.getDependencies();
    const generated: any = generate(asset.ast, {}, asset.contents);
    const code = generated.code;
    expect(code).toBe(`;`);
  });
});
