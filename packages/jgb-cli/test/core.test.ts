import { pathToUnixType } from 'jgb-shared/lib/utils/index';
import * as path from 'path';
import { aliasResolve } from '../src/core';

describe('aliasResolve', () => {
  it('absolute path', () => {
    const options = {
      alias: {
        '@a': '/a'
      }
    } as any;
    const result = aliasResolve(options, process.cwd());
    matchAliasResult(result, '@a', '/a');
  });

  it('relative path', () => {
    const options = {
      alias: {
        '@a': './a'
      }
    } as any;
    const result = aliasResolve(options, process.cwd());
    matchAliasResult(
      result,
      '@a',
      pathToUnixType(path.resolve(process.cwd(), './a'))
    );
  });

  it('npm module', () => {
    const options = {
      alias: {
        '@a': 'jgb-shared'
      }
    } as any;
    const result = aliasResolve(options, process.cwd());
    matchAliasResult(
      result,
      '@a',
      pathToUnixType(path.resolve(process.cwd(), './node_modules/jgb-shared'))
    );
  });
});

function matchAliasResult(alias: any, key: string, value: string) {
  const target = alias[key];
  if (!target) {
    return;
  }
  if (Array.isArray(target) && target.length) {
    expect(target[0].path).toBe(value);
  }
}
