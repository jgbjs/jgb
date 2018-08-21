import Asset from './Asset';
import * as Config from './config';
import declare from './pluginDeclare';
import Resolver from './Resolver';
import * as Utils from './utils';
import localRequire, { safeLocalRequire } from './utils/localRequire';

export * from '../typings/jgb-shared';

export default {
  Asset,
  declare,
  Resolver,
  Config,
  localRequire,
  safeLocalRequire,
  Utils
};

export {
  Asset,
  Resolver,
  declare,
  Config,
  localRequire,
  safeLocalRequire,
  Utils
};
