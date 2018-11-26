import isObject = require('lodash/isObject');
import { IEventFunction } from '../../types/eventbus';
import { Intercept, Mixin } from './index';

/** init expand的方法名 */
export const INIT = Symbol('INIT');

/**
 * 扩展对象方法
 * static mixin
 * static intercept
 * INIT: Symbol('INIT')
 *
 * @export
 * @param {Function} fn
 * @returns
 */
export default function expand(
  // tslint:disable-next-line:ban-types
  fn: Function,
  interceptEntry: string
) {
  let mixins: any[] = [];
  const intercepts = new Map<string, IEventFunction[]>();

  return (constructor: any) => {
    if (typeof constructor !== 'function') {
      throw new Error(`constructor is not a function`);
    }

    constructor[INIT] = init;

    constructor.mixin = mixin;

    constructor.intercept = intercept;

    return constructor;
  };

  function init(opts: any, ctx: any = {}) {
    const entryIntercepts = intercepts.get(interceptEntry) || [];
    opts = Mixin(
      opts,
      mergeMixins([
        ctx,
        {
          [interceptEntry]() {
            // intercept use Object.defineProperty
            // so Intercept invoke must be init after first lifycycle
            // but will miss interceptEntry functions
            Intercept(this, intercepts);
          }
        }
      ])
    );
    const interceptEntryFn = opts[interceptEntry];
    opts[interceptEntry] = function(...data: any[]) {
      const self = this;
      return interceptEntryFn.apply(
        self,
        entryIntercepts.reduce((prevValue, invoke) => {
          return invoke.apply(self, prevValue);
        }, data)
      );
    };

    let tempOpts: any = opts;
    while (tempOpts && tempOpts !== Object.prototype) {
      delete tempOpts.constructor;
      tempOpts = Object.getPrototypeOf(tempOpts);
    }

    fn(opts);
  }

  // pref: 防止过多页面及mixins需要Mixin，先做一边Mixin
  function mergeMixins(otherMixins: any[] = []) {
    if (mixins.length > 1) {
      const tmp = {};
      Mixin(tmp, new Set(mixins));

      mixins = [tmp];
    }

    return new Set(mixins.concat(otherMixins));
  }

  function mixin(obj: any) {
    if (!isObject(obj)) {
      return;
    }

    mixins.push(obj);
  }

  function intercept(event: string, ifn: IEventFunction) {
    const fns = intercepts.get(event) || [];
    fns.push(ifn);
    intercepts.set(event, fns);
  }
}
