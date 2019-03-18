import { IEventFunction } from '../../types/eventbus';
import { IInterceptFn, IInterceptStatus } from '../../types/jgb-api';
import { noPromiseApis, onAndSyncApis } from './native-apis';

type interceptValue = [IEventFunction, IInterceptStatus];

export const intercepts = new Map<string, interceptValue[]>();

export function getIntercept(key: string) {
  // @ts-ignore
  // async api use async reduce
  if (!onAndSyncApis[key] && !noPromiseApis[key]) {
    return (result: any, status: IInterceptStatus, options?: any) => {
      const tasks = intercepts.get(key);

      if (!tasks || tasks.length === 0) {
        return result;
      }

      return tasks.reduce(async (r: any, t) => {
        const [task, requiredStatus] = t;
        const prevResult = await r;
        if (!requiredStatus) {
          return task(prevResult, status, options);
        }
        if (requiredStatus === status) {
          return task(prevResult, status, options);
        }
        return prevResult;
      }, result);
    };
  }

  return (result: any, status: IInterceptStatus, options?: any) => {
    const tasks = intercepts.get(key);

    if (!tasks || tasks.length === 0) {
      return result;
    }

    return tasks.reduce((r: any, t) => {
      const [task, requiredStatus] = t;
      if (!requiredStatus) {
        return task(r, status, options);
      }
      if (requiredStatus === status) {
        return task(r, status, options);
      }
      return r;
    }, result);
  };
}

export function initInercept(jgb: any = {}) {
  Object.defineProperty(jgb, 'intercept', {
    get() {
      return (event: string, ...data: any[]) => {
        let status: IInterceptStatus;
        let fn: IInterceptFn;
        if (data.length > 1) {
          [status, fn] = data;
        } else {
          [fn] = data;
        }

        if (typeof fn !== 'function') {
          intercepts.delete(event);
          return;
        }

        const fns = intercepts.get(event) || [];
        fns.push([fn, status]);
        intercepts.set(event, fns);
      };
    }
  });
}
