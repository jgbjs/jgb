/**
 * 参考 taro
 * https://github.com/NervJS/taro/blob/a16bb2cd0e9bbc44562877fc8476ff797c688b9c/packages/taro-weapp/src/native-api.js
 */
import { IInterceptStatus } from '../../types/jgb-api';
import PromiseTask from '../utils/task';
import { getIntercept, initInercept } from './intercept';
import { noPromiseApis, onAndSyncApis } from './native-apis';
import { request } from './network';

const networkApi = ['request'];

export default function initNativeApi(jgb: any = {}) {
  const weApis = Object.assign({}, wx);

  Object.keys(weApis).forEach(key => {
    const doIntercept = getIntercept(key);
    if (networkApi.includes(key)) {
      jgb[key] = request;
    }
    // @ts-ignore
    else if (!onAndSyncApis[key] && !noPromiseApis[key]) {
      jgb[key] = (options: any = {}, ...args: any[]) => {
        let task: any = {};

        const p = new PromiseTask(async (resolve, reject) => {
          // 拦截入参
          options = (await doIntercept(options, 'begin', options)) || options;

          const obj: any = Object.assign({}, options);

          if (typeof options !== 'object') {
            // @ts-ignore
            const result = wx[key](options, ...args);
            resolve(doIntercept(result, 'success', options) || result);
            return;
          }

          ['fail', 'success', 'complete'].forEach((k: IInterceptStatus) => {
            obj[k] = async (res: any) => {
              res = (await doIntercept(res, k, obj)) || res;
              // tslint:disable-next-line:no-unused-expression
              options[k] && options[k](res);
              if (k === 'success') {
                if (key === 'connectSocket') {
                  resolve(
                    Promise.resolve().then(() => Object.assign(task, res))
                  );
                } else {
                  resolve(res);
                }
              } else if (k === 'fail') {
                reject(res);
              }
            };
          });
          // @ts-ignore
          task = wx[key](obj, ...args);
        });

        if (['uploadFile', 'downloadFile', 'request'].includes(key)) {
          p.onProgressUpdate = cb => {
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
        args = [].concat(doIntercept(args, 'begin', args) || args);
        // @ts-ignore
        const result = wx[key].apply(wx, args);
        return doIntercept(result, 'success', args) || result;
      };
    }
  });

  initInercept(jgb);
}
