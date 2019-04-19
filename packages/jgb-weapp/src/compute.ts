import { CallNode, CallTree } from './utils/calltree';

const hasOwnProperty = Object.prototype.hasOwnProperty;
const cache = Symbol(`cache`);
const setData = Symbol(`setData`);
const doingSetData = Symbol(`doingSetData`);
const doingSetProps = Symbol(`doingSetProps`);

/**
 * 计算属性
 */
export function Compute(opts: any) {
  const computed = opts.computed || {};
  const data = opts.data || {};
  const properties = opts.properties || {};

  const computedKeys = Object.keys(computed);
  const propertyKeys = Object.keys(properties);

  // 先将 properties 里的字段写入到 data 中
  if (propertyKeys.length) {
    propertyKeys.forEach(key => {
      if (hasOwnProperty.call(propertyKeys, key)) {
        return;
      }
      const value = properties[key];
      const valueType = Object.prototype.toString.call(value);
      let oldObserver: any;
      if (
        valueType === '[object Function]' ||
        valueType === '[object Null]' ||
        valueType === '[object Array]'
      ) {
        properties[key] = {
          type: value
        };
      } else if (typeof value === 'object') {
        if (hasOwnProperty.call(value, 'value')) {
          // 处理值
          data[key] = value.value;
        }

        if (
          hasOwnProperty.call(value, 'observer') &&
          typeof value.observer === 'function'
        ) {
          oldObserver = value.observer;
        }
      }

      // 追加 observer，用于监听变动
      properties[key].observer = function(...args: any[]) {
        const originalSetData = this[setData];
        
        // 调用 setData 设置 properties
        if (this[doingSetProps]) {
          if (oldObserver) {
            oldObserver.apply(this, args);
          }
          return;
        }

        if (this[doingSetData]) {
          // eslint-disable-next-line no-console
          console.warn("can't call setData in computed getter function!");
          return;
        }

        this[doingSetData] = true;

        // 计算 computed
        const needUpdate = calcComputed(this, computed, computedKeys);

        // 做 computed 属性的 setData
        originalSetData.call(this, needUpdate);

        this[doingSetData] = false;

        if (oldObserver) {
          oldObserver.apply(this, args);
        }
      };
    });
  }

  // 计算 computed
  calcComputed(opts, computed, computedKeys);

  return function init(scope: any) {
    scope[cache] = {};
    scope[setData] = scope.setData;
    scope[doingSetData] = false;
    scope[doingSetProps] = false;
    Object.defineProperty(scope, 'setData', {
      configurable: true,
      get() {
        return _setData;
      }
    });

    function _setData(data: any, callback: any) {
      const originalSetData = this[setData];

      if (this[doingSetData]) {
        // eslint-disable-next-line no-console
        console.warn("can't call setData in computed getter function!");
        return;
      }

      this[doingSetData] = true;

      // TODO 过滤掉 data 中的 computed 字段
      const dataKeys = Object.keys(data);
      for (let i = 0, len = dataKeys.length; i < len; i++) {
        const key = dataKeys[i];

        if (computed[key]) {
          delete data[key];
        }
        if (!this[doingSetProps] && propertyKeys.indexOf(key) >= 0) {
          this[doingSetProps] = true;
        }
      }

      // 做 data 属性的 setData
      originalSetData.call(this, data, callback);

      // 计算 computed
      const needUpdate = calcComputed(this, computed, computedKeys);

      // 做 computed 属性的 setData
      originalSetData.call(this, needUpdate);

      this[doingSetData] = false;
      this[doingSetProps] = false;
    }
  };
}

export function calcComputed(scope: any, computed: any, keys: any[]) {
  const needUpdate: any = {};
  const computedKeys = [].concat(keys);
  const callTree = new CallTree();

  // 修复当没有this.data时会报错
  if (!scope.data) {
    scope.data = {};
  }

  const computedCache = scope[cache] || scope.data || {};

  const getAndSetCache = (key: string, getter: any) => {
    if (typeof getter !== 'function') {
      return;
    }
    const value = getter.call(scope);
    if (computedCache[key] !== value) {
      needUpdate[key] = value;
      computedCache[key] = value;

      // 修复computed的属性引用computed的属性 计算值时获取不到实时数据
      scope.data[key] = value;
    }
  };

  for (let i = 0, len = computedKeys.length; i < len; i++) {
    const key = computedKeys[i];
    const getter = computed[key];
    if (typeof getter === 'function') {
      const depkeys = fnContainsComputeKey(getter, computed);
      const callNode = new CallNode(key, [...depkeys]);
      callTree.addCallNode(callNode);
    }
  }

  const squence = callTree.getBestCallStackSequence();
  squence.forEach(node => {
    const getter = computed[node.key];
    getAndSetCache(node.key, getter);
  });

  return needUpdate;
}

const cacheContainsComputekey = new Map();

/**
 * 获取computed中包含的其他computed的key
 * e.g.
 *  this.data.key
 *  this.data['key'] this.data["key"]
 * @param fn
 * @param computed
 */
export function fnContainsComputeKey(fn: any, computed: any): Set<string> {
  if (cacheContainsComputekey.has(fn)) {
    return cacheContainsComputekey.get(fn);
  }

  const str: string = fn.toString();
  const keys = Object.keys(computed);
  const reg1 = new RegExp(`data\\.(${keys.join('|')})`, 'g');
  const reg2 = new RegExp(`data\\[('|")(${keys.join('|')})\\1\\]`, 'g');
  const matchComputeKeys = new Set<string>();
  let matches;
  // tslint:disable-next-line: no-conditional-assignment
  while ((matches = reg1.exec(str)) !== null) {
    matchComputeKeys.add(matches[1]);
  }

  // tslint:disable-next-line: no-conditional-assignment
  while ((matches = reg2.exec(str)) !== null) {
    matchComputeKeys.add(matches[2]);
  }

  return matchComputeKeys;
}
