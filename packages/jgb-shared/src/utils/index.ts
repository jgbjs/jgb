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
