import * as path from 'path';
import Asset, { cache } from '../src/Asset';
import { pathToUnixType } from '../src/utils/index';

beforeEach(()=>{
  cache.clear()
})

describe('resolveAliasName', () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');
  const outDir = path.resolve(__dirname, './example-dist');
  const asset = new Asset(path.resolve(sourceDir, 'index.js'), {
    rootDir,
    sourceDir,
    outDir,
    extensions: new Set(['.js', '.css', '.ts']),
    alias: {
      '@alias': path.resolve(sourceDir, 'alias'),
      '@test': rootDir
    }
  });

  test('resolve as currentDir', async () => {
    const result = await asset.resolveAliasName('test.js', '.js');

    expect(result.realName).toBe(
      pathToUnixType(path.join(sourceDir, 'test.js'))
    );
    expect(result.distPath).toBe(pathToUnixType(path.join(outDir, 'test.js')));
  });

  test('resolve absolte path', async () => {
    const result = await asset.resolveAliasName('/test.js', '.js');

    expect(result.realName).toBe(
      pathToUnixType(path.join(sourceDir, 'test.js'))
    );
    expect(result.distPath).toBe(pathToUnixType(path.join(outDir, 'test.js')));
  });

  test('resolve relative path', async () => {
    const result = await asset.resolveAliasName('./test.js', '.js');

    expect(result.realName).toBe(
      pathToUnixType(path.join(sourceDir, 'test.js'))
    );
    expect(result.distPath).toBe(pathToUnixType(path.join(outDir, 'test.js')));
  });

  test('resolve alias in sourceDir', async () => {
    const result = await asset.resolveAliasName('@alias/alias.js', '.js');

    expect(result.realName).toBe(
      pathToUnixType(path.join(sourceDir, 'alias/alias.js'))
    );
    expect(result.distPath).toBe(
      pathToUnixType(path.join(outDir, 'alias/alias.js'))
    );
  });

  test('resolve alias out sourceDir', async () => {
    const result = await asset.resolveAliasName('@test/assets.test.ts', '.js');

    expect(result.realName).toBe(
      pathToUnixType(path.join(rootDir, 'assets.test.ts'))
    );
    expect(result.distPath).toBe(
      pathToUnixType(path.join(outDir, 'npm/@test/assets.test.js'))
    );
  });

  test('resolve node_modules', async () => {
    const result = await asset.resolveAliasName('debug', '.js');

    expect(result.realName).toBe(
      pathToUnixType(path.join(rootDir, '../node_modules/debug/src/index.js'))
    );
    expect(result.distPath).toBe(
      pathToUnixType(path.join(outDir, 'npm/debug/src/index.js'))
    );
  });
});

describe('resolveAliasName target = swan', () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');
  const outDir = path.resolve(__dirname, './example-dist');
  const asset = new Asset(path.resolve(sourceDir, 'index.js'), {
    rootDir,
    sourceDir,
    outDir,
    target: 'swan',
    extensions: new Set(['.js', '.css', '.ts']),
    alias: {}
  });

  test('resolve exist .swan.js', async () => {
    const distPath = pathToUnixType(path.join(outDir, 'test.js'));
    asset.distPath = distPath;
    const result = await asset.resolveAliasName('test.js', '.js');
    expect(result.realName).toBe(
      pathToUnixType(path.join(sourceDir, 'test.swan.js'))
    );
    expect(result.distPath).toBe(distPath);
  });

  test('resolve not exist .swan.js', async () => {
    const distPath = pathToUnixType(path.join(outDir, 'alias/alias.js'));
    asset.distPath = distPath;
    const result = await asset.resolveAliasName('alias/alias.js', '.js');
    expect(result.realName).toBe(
      pathToUnixType(path.join(sourceDir, 'alias/alias.js'))
    );
    expect(result.distPath).toBe(distPath);
  });
});
