/**
 * 参考 taro
 * https://github.com/NervJS/taro/blob/a16bb2cd0e9bbc44562877fc8476ff797c688b9c/packages/taro-weapp/src/native-api.js
 */
import { IEventFunction } from '../../types/eventbus';
import PromiseTask from '../utils/task';
import { noPromiseApis, onAndSyncApis, otherApis } from './native-apis';

const intercepts = new Map<string, IEventFunction[]>();

export type IInterceptStatus = 'fail' | 'success' | 'complete' | 'begin';

export type IInterceptFn = (
  /** 返回值  */
  result: any,
  /** 状态  */
  status: IInterceptStatus,
  /** 调用方法参数  */
  options: any
) => any;

function getIntercept(key: string) {
  return (result: any, status: IInterceptStatus, options?: any) => {
    const target = intercepts.get(key);

    if (!target || target.length === 0) {
      return result;
    }

    target.reduce((r: any, task) => {
      return task(r, status, options);
    }, result);
    return result;
  };
}

export default function initNativeApi(jgb: any = {}) {
  const weApis = Object.assign({}, onAndSyncApis, noPromiseApis, otherApis);

  Object.keys(weApis).forEach(key => {
    const doIntercept = getIntercept(key);
    // @ts-ignore
    if (!onAndSyncApis[key] && !noPromiseApis[key]) {
      jgb[key] = (options: any = {}) => {
        let task: any = null;

        options = doIntercept(options, 'begin', options);

        const obj: any = Object.assign({}, options);

        if (typeof options === 'string') {
          // @ts-ignore
          const result = wx[key](options);
          return doIntercept(result, 'success', options);
        }
        const p = new PromiseTask((resolve, reject) => {
          ['fail', 'success', 'complete'].forEach((k: IInterceptStatus) => {
            obj[k] = (res: any) => {
              res = doIntercept(res, k, obj);
              // tslint:disable-next-line:no-unused-expression
              options[k] && options[k](res);
              if (k === 'success') {
                if (key === 'connectSocket') {
                  resolve(doIntercept(task, k, obj));
                } else {
                  resolve(res);
                }
              } else if (k === 'fail') {
                reject(res);
              }
            };
          });
          // @ts-ignore
          task = wx[key](obj);
        });
        if (['uploadFile', 'downloadFile', 'request'].includes(key)) {
          p.progress = cb => {
            if (typeof task.onProgressUpdate === 'function') {
              task.onProgressUpdate(cb);
            }
            return p;
          };
          p.abort = cb => {
            // tslint:disable-next-line:no-unused-expression
            cb && cb();
            if (typeof task.abort === 'function') {
              task.abort(cb);
            }
            return p;
          };
        }
        return p;
      };
    } else {
      jgb[key] = (...args: any[]) => {
        args = doIntercept(args, 'begin', args);

        // @ts-ignore
        const result = wx[key].apply(wx, args);
        return doIntercept(result, 'success', args);
      };
    }
  });

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

        const fns = intercepts.get(event) || [];
        fns.push(fn);
        intercepts.set(event, fns);
      };
    }
  });
}
