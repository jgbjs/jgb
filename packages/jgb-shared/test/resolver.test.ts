import * as path from 'path';
import Resolver, { sortAliasKeys } from '../src/Resolver';
import { pathToUnixType } from '../src/utils/index';

describe('resolveModule', () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');

  const resolver = new Resolver({
    rootDir,
    sourceDir,
    extensions: new Set(['.ts', '.js', '.css']),
    alias: {
      '@alias': path.resolve(sourceDir, 'alias')
    }
  });

  test('resolveModule resolve as currentDir', async () => {
    const result = await resolver.resolveModule(
      'test.js',
      path.resolve(sourceDir, 'index.js')
    );

    expect(result.filePath).toBe(
      pathToUnixType(path.join(sourceDir, 'test.js'))
    );
  });

  test('resolveModule resolve absolte path', async () => {
    const result = await resolver.resolveModule(
      '/test.js',
      path.resolve(sourceDir, 'index.js')
    );

    expect(result.filePath).toBe(
      pathToUnixType(path.resolve(sourceDir, 'test.js'))
    );
  });

  test('resolveModule resolve relative path', async () => {
    const result = await resolver.resolveModule(
      './test.js',
      path.resolve(sourceDir, 'index.js')
    );

    expect(result.filePath).toBe(
      pathToUnixType(path.resolve(sourceDir, 'test.js'))
    );
  });

  test('resolveModule resolve alias', async () => {
    const result = await resolver.resolveModule(
      '@alias/alias.js',
      path.resolve(sourceDir, 'index.js')
    );

    expect(result.filePath).toBe(
      pathToUnixType(path.resolve(sourceDir, 'alias/alias.js'))
    );
  });

  test('resolveModule resolve node_modules', async () => {
    const result = await resolver.resolveModule(
      'debug',
      path.resolve(sourceDir, 'index.js')
    );

    expect(result.moduleDir).toBe(
      path.resolve(rootDir, '../node_modules/debug')
    );

    expect(result.filePath).toBe(
      path.resolve(rootDir, '../node_modules/debug')
    );
  });
});

describe('resolve', () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');

  const resolver = new Resolver({
    rootDir,
    sourceDir,
    extensions: new Set(['.ts', '.js', '.css']),
    alias: {
      '@alias': path.resolve(sourceDir, 'alias'),
      '@utils/*': path.resolve(sourceDir, 'utils')
    }
  });

  test('resolve local file', async () => {
    const result = await resolver.resolve(
      'utils/index.js',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/index.js'))
    );
  });

  test('resolve local file with no ext', async () => {
    const result = await resolver.resolve(
      './utils/index',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/index.js'))
    );
  });

  test('resolve absolute path file', async () => {
    const result = await resolver.resolve(
      '/utils/index.js',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/index.js'))
    );
  });

  test('resolve absolute component', async () => {
    const result = await resolver.resolve(
      '/utils/index',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/index.js'))
    );
  });

  test('resolve node_module', async () => {
    const result = await resolver.resolve(
      'debug',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(
        path.resolve(rootDir, '../node_modules/debug/src/index.js')
      )
    );
    expect(result.pkg).toMatchObject({ name: 'debug' });
  });

  test('resolve xinghao *', async () => {
    const result = await resolver.resolve(
      '@utils/index.js',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/index.js'))
    );
  });

  test('resolve file name contains . with same ext', async () => {
    const result = await resolver.resolve(
      './utils/test.abc',
      path.resolve(sourceDir, 'index.js')
    );
    console.log(result.path);
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/test.abc.js'))
    );
  });

  test('resolve .js first', async () => {
    const result = await resolver.resolve(
      './utils/test.abc',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/test.abc.js'))
    );
  });

  test('resolve .ts first', async () => {
    const result = await resolver.resolve(
      './utils/utils.abc',
      path.resolve(sourceDir, 'index.ts')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/utils.abc.ts'))
    );
  });

  test('resolve file name contains . with different ext', async () => {
    const result = await resolver.resolve(
      './utils.abc',
      path.resolve(sourceDir, 'utils/index.js')
    );
    expect(result.path).toBe(
      pathToUnixType(path.resolve(sourceDir, './utils/utils.abc.ts'))
    );
  });
});

describe('sort alias', () => {
  it('sortAliasKeys jgb.config', () => {
    const sortedKeys = sortAliasKeys({
      '@abc': [],
      '@a': [],
      'dist/abc': []
    });
    expect(sortedKeys).toMatchObject(['dist/abc', '@abc', '@a']);
  });

  it('sortAliasKeys tsconfig', () => {
    const sortedKeys = sortAliasKeys({
      '@abc/*': [],
      '@a/*': [],
      'dist/abc/*': []
    });
    expect(sortedKeys).toMatchObject(['dist/abc/*', '@abc/*', '@a/*']);
  });

  it('sortAliasKeys common', () => {
    const sortedKeys = sortAliasKeys({
      '@abc/*': [],
      '@/a': [],
      '@a/*': [],
      '@abc/': [],
      'dist/abc/*': []
    });
    expect(sortedKeys).toMatchObject([
      '@abc/',
      '@/a',
      'dist/abc/*',
      '@abc/*',
      '@a/*'
    ]);
  });
});

describe('expandFiles', () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');

  const extensions = ['.js', '.wxss', '.json', '.wxml'];
  const resolver = new Resolver({
    rootDir,
    sourceDir,
    extensions: new Set(extensions),
    alias: {
      '@alias': path.resolve(sourceDir, 'alias')
    }
  });
  test('expandFiles relative ', async () => {
    const result = await resolver.expandFile('pages/index', extensions, {});

    expect(result.length).toBe(4);
  });

  test('expandFiles absolute project', async () => {
    const result = await resolver.expandFile('/pages/index', extensions, {});
    expect(result.length).toBe(4);
  });

  test('expandFiles absolute', async () => {
    const abPath = path.resolve(sourceDir, 'pages/index');
    const result = await resolver.expandFile(abPath, extensions, {});
    expect(result.length).toBe(4);
  });
});
