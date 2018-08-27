import * as path from 'path';
import { IAliasValue } from '../../typings/jgb-shared';
import isUrl from './isUrl';
import loadPlugins from './loadPlugins';
import localRequire from './localRequire';
import md5 from './md5';
import objectHash from './objectHash';
import urlJoin from './urlJoin';

export { isUrl, loadPlugins, localRequire, md5, objectHash, urlJoin };
export * from './localRequire';
export * from './md5';

export function normalizeAlias(alias: IAliasValue) {
  if (typeof alias === 'string') {
    return {
      path: alias
    };
  }

  return alias;
}

/**
 * 修正relatviePath
 * @param fPath
 */
export function promoteRelativePath(fPath: string) {
  const fPathArr = fPath.split(path.sep);
  let dotCount = 0;
  fPathArr.forEach(item => {
    if (item.indexOf('..') >= 0) {
      dotCount++;
    }
  });
  if (dotCount === 1) {
    fPathArr.splice(0, 1, '.');
    return fPathArr.join('/');
  }
  if (dotCount > 1) {
    fPathArr.splice(0, 1);
    return fPathArr.join('/');
  }
  return pathToUnixType(fPath);
}

export function pathToUnixType(fPath: string) {
  return fPath.replace(/\\/g, '/');
}
