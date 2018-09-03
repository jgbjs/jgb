import { IEventFunction } from './EventBus';
export function Mixin(base: any, mixins: Map<string, IEventFunction[]>) {
  for (const key of Object.keys(mixins)) {
    const value = mixins.get(key);
    if (isFunction(value)) {
      const baseValue = base[key];
      base[key] = isFunction(baseValue)
        ? baseValue
        : (...data: any[]) => {
            safeInvoke(value, data);
            baseValue(...data);
          };
    }
  }

  return base;
}

export function safeInvoke(fn: IEventFunction | IEventFunction[], data: any[]) {
  const fns = [].concat(fn);

  for (const f of fns) {
    f(...data);
  }
}

export function isFunction(obj: any) {
  return typeof obj === 'function';
}
