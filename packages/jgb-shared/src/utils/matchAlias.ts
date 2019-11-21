import { memoize } from 'lodash';

const keyToReg = memoize((key: string) => {
  return new RegExp(`^${key.replace('*', '(.*)')}`);
});

/**
 * 比较filePath是否匹配alias
 *
 * \@utils/* => @utils/index/xxx
 *
 * \@utils/ => @utils/xxx
 *
 * \@utils/index => @utils/index
 *
 */
export const matchAlias = memoize(
  (key: string, moduleName: string) => {
    const regexp = keyToReg(key);
    const match = regexp.exec(moduleName);
    return match;
  },
  (...args) => {
    return args.join('-');
  }
);
