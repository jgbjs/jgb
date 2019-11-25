import * as path from 'path';
import Resolver from '../src/Resolver';
import { pathToUnixType } from '../src/utils/index';

describe('resolveModule', () => {
  const rootDir = path.resolve(__dirname, '.');
  const sourceDir = path.resolve(__dirname, './example');

  const resolver = new Resolver({
    rootDir,
    sourceDir,
    extensions: new Set(['.js', '.css']),
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
      pathToUnixType(path.resolve(sourceDir, 'test.js'))
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
    extensions: new Set(['.js', '.css']),
    alias: {
      '@alias': path.resolve(sourceDir, 'alias'),
      '@utils/*': path.resolve(sourceDir, 'utils')
    }
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

  test('resolve node_module', async () => {
    const result = await resolver.resolve(
      'debug',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(
      path.resolve(rootDir, '../node_modules/debug/src/browser.js')
    );
    expect(result.pkg).toMatchObject({ name: 'debug' });
  });

  test('resolve xinghao *', async () => {
    const result = await resolver.resolve(
      '@utils/index.js',
      path.resolve(sourceDir, 'index.js')
    );
    expect(result.path).toBe(path.resolve(sourceDir, './utils/index.js'));
  });
});
