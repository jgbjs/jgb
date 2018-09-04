import defaultsDeep = require('lodash/defaultsDeep');
import isFunction = require('lodash/isFunction');
import isObject = require('lodash/isObject');
import { IEventFunction } from '../EventBus';

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
