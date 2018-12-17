import defaultsDeep = require('lodash/defaultsDeep');
import isFunction = require('lodash/isFunction');
import isObject = require('lodash/isObject');
import { IEventFunction } from '../../types/eventbus';

// tslint:disable-next-line:ban-types
export function promisify<T extends Function>(wxMethod: T) {
  return (params: any) =>
    new Promise((resolve, reject) => {
      params.success = resolve;
      params.fail = reject;
      wxMethod(params);
    });
}

export function Mixin(base: any, mixins: Set<any>) {
  for (const mixObj of mixins) {
    const keys = [];
    // tslint:disable-next-line:variable-name
    let _mixObj = mixObj;
    while (_mixObj !== null && _mixObj !== Object.prototype) {
      keys.push(...Object.getOwnPropertyNames(_mixObj));
      _mixObj = Object.getPrototypeOf(_mixObj) || _mixObj.__proto__;
    }
    for (const key of keys) {
      const baseValue = base[key];
      const value = mixObj[key];
      if (typeof baseValue === 'undefined') {
        base[key] = value;
      } else if (isFunction(value) && isFunction(baseValue)) {
        base[key] = function(...data: any[]) {
          value.apply(this, data);
          baseValue.apply(this, data);
        };
      } else if (isObject(baseValue) && isObject(value)) {
        defaultsDeep(baseValue, value);
      } else if (Array.isArray(baseValue) && Array.isArray(value)) {
        baseValue.push(...value);
      }
    }
  }

  return base;
}

// tslint:disable-next-line:no-empty
export const noop = () => {};

export const systemInfo = wx.getSystemInfoSync() as any;

/**
 * 比较版本
 * v1 === v2 return 0
 * v1 > v2 return 1
 * v1 < v2 return -1
 * @returns
 */
export function compareVersion(v1: string, v2: string) {
  const v1Arr = v1.split('.');
  const v2Arr = v2.split('.');
  const len = Math.max(v1.length, v2.length);

  while (v1.length < len) {
    v1Arr.push('0');
  }
  while (v2.length < len) {
    v2Arr.push('0');
  }

  for (let i = 0; i < len; i++) {
    const num1 = parseInt(v1Arr[i], 10);
    const num2 = parseInt(v2Arr[i], 10);

    if (num1 > num2) {
      return 1;
    } else if (num1 < num2) {
      return -1;
    }
  }

  return 0;
}

export function isSupportVersion(version: string) {
  return compareVersion(systemInfo.SDKVersion, version) >= 0;
}

export function Intercept(
  base: any,
  intercepts: Map<string, IEventFunction[]>
) {
  for (const [key, values] of intercepts) {
    let baseValue: IEventFunction = base[key];
    if (!isFunction(baseValue)) {
      continue;
    }
    Object.defineProperty(base, key, {
      set(nvalue) {
        baseValue = nvalue;
      },
      get() {
        return (...data: any[]) => {
          const fns = values.concat(baseValue);
          return fns.reduce((prevValue, fn) => {
            return fn.apply(this, prevValue);
          }, data);
        };
      }
    });
  }
  return base;
}
