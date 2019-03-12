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
        return
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

        if (this[doingSetProps]) {
          // 调用 setData 设置 properties
          if (oldObserver) oldObserver.apply(this, args);
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

        if (oldObserver) oldObserver.apply(this, args);
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

        if (computed[key]) delete data[key];
        if (!this[doingSetProps] && propertyKeys.indexOf(key) >= 0)
          this[doingSetProps] = true;
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

export function calcComputed(scope: any, computed: any, computedKeys: any[]) {
  const needUpdate: any = {};
  const computedCache = scope[cache] || scope.data || {};

  for (let i = 0, len = computedKeys.length; i < len; i++) {
    const key = computedKeys[i];
    const getter = computed[key];

    if (typeof getter === 'function') {
      const value = getter.call(scope);

      if (computedCache[key] !== value) {
        needUpdate[key] = value;
        computedCache[key] = value;
      }
    }
  }

  return needUpdate;
}
