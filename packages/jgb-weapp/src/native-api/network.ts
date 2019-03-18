import { jgb } from '../../types';
import { ArgumentType } from '../../types/jgb-api';
import EventBus from '../EventBus';
import { getIntercept } from './intercept';

type RequestOptions = ArgumentType<typeof jgb.request> & {
  /**
   * 请求id 唯一
   */
  $requestId?: number;
};

type IRequestTask = ReturnType<typeof wx.request>;

let uuid = 0;

export class RequestQueue {
  /**
   * 最大请求数
   */
  MAX = 10;
  /**
   * 请求中的数量
   */
  running = 0;
  queue: RequestOptions[] = [];
  readyRequestTasks = new Map<number, any>();

  request(options: RequestOptions): Promise<IRequestTask> {
    this.push(options);
    return this.next(options) as Promise<IRequestTask>;
  }

  push(options: RequestOptions) {
    options.priority =
      typeof options.priority !== 'number' ? 1 : options.priority;
    if (typeof options.$requestId !== 'number') {
      options.$requestId = uuid++;
    }
    this.queue.push(options);
  }

  /**
   * 根据请求优先级排序
   */
  sortQueue() {
    this.queue = this.queue.sort((q1, q2) => q1.priority - q2.priority);
  }

  async next(currentOpts?: RequestOptions): Promise<IRequestTask | void> {
    if (this.queue.length === 0) {
      return;
    }
    return new Promise<IRequestTask>(async resolve => {
      const remaining = this.MAX - this.running;
      if (
        remaining > 0 &&
        this.queue.length &&
        remaining >= Math.min(this.queue[0].priority, this.MAX)
      ) {
        this.running++;
        const doIntercept = getIntercept('request');
        this.sortQueue();
        let options = this.queue.shift();
        options = (await doIntercept(options, 'begin', options)) || options;

        const completeFn = options.complete;
        const successFn = options.success;
        const failFn = options.fail;

        options.success = async (res: any) => {
          res = (await doIntercept(res, 'success', options)) || res;
          successFn && successFn(res);
        };

        options.fail = async (res: any) => {
          res = (await doIntercept(res, 'fail', options)) || res;
          failFn && failFn(res);
        };

        options.complete = async (res: any) => {
          this.running--;
          try {
            res = (await doIntercept(res, 'complete', options)) || res;
            completeFn && completeFn.call(options, res);
          } catch {}
          this.next();
        };
        
        const $requestId = options.$requestId;
        const resolveTask = this.readyRequestTasks.get($requestId);
        const requestTask = wx.request(options);
        if (resolveTask) {
          this.readyRequestTasks.delete($requestId);
          resolveTask(requestTask);
        } else {
          resolve(requestTask);
        }
      } else if (currentOpts) {
        this.readyRequestTasks.set(currentOpts.$requestId, resolve);
      }
    });
  }
}

export const requestQueue = new RequestQueue();

interface IRequest {
  <T = any>(options: RequestOptions): Promise<T> & wxNS.RequestTask;
  Max?: number;
  bus?: EventBus;
}

export function CreateRequestWithLazyLoadRequestTask(rq = requestQueue) {
  const bus = new EventBus();
  const fn: IRequest = <T = any>(
    options: RequestOptions
  ): Promise<T> & IRequestTask => {
    let requestTask: IRequestTask;
    const requestId = uuid++;
    options.$requestId = requestId;
    rq.MAX = fn.Max || 10;
    const notifyEvent = createNotifyTask(options);

    const p = new Promise<T>(async (resolve, reject) => {
      const { success, fail } = options;
      options.success = function(...args: any[]) {
        success && success.apply(this, args);
        resolve(...args);
      };

      options.fail = function(...args: any[]) {
        fail && fail.apply(this, args);
        reject(...args);
      };

      try {
        requestTask = await rq.request(options);
      } catch (error) {}

      bus.emit(notifyEvent, requestTask);
    });

    Object.defineProperties(p, {
      abort: {
        get() {
          if (requestTask && requestTask.abort) {
            return requestTask.abort;
          } else {
            return (...args: any[]) => {
              bus.emit(`abort:${requestId}`, args);
            };
          }
        }
      },
      offHeadersReceived: {
        get() {
          if (requestTask && requestTask.offHeadersReceived) {
            return requestTask.offHeadersReceived;
          } else {
            return (cb: any) => {
              bus.emit(`offHeadersReceived:${requestId}`, cb);
            };
          }
        }
      },
      onHeadersReceived: {
        get() {
          if (requestTask && requestTask.onHeadersReceived) {
            return requestTask.onHeadersReceived;
          } else {
            return (cb: any) => {
              bus.emit(`onHeadersReceived:${requestId}`, cb);
            };
          }
        }
      }
    });

    return p as any;
  };

  /**
   * 最大请求数
   */
  fn.Max = 10;
  fn.bus = bus;

  return fn;

  function createNotifyTask(
    options: RequestOptions,
    requestId = options.$requestId
  ) {
    const busId = [] as number[];
    const abortMethods = [] as any[];
    const offHeadersReceivedMethods = [] as any[];
    const onHeadersReceivedMethods = [] as any[];

    const notifyEvent = `requestTask:${requestId}`;
    bus.once(notifyEvent, (requestTask: IRequestTask) => {
      if (requestTask) {
        if (requestTask.abort && abortMethods.length) {
          requestTask.abort();
        }

        if (requestTask.onHeadersReceived && onHeadersReceivedMethods.length) {
          requestTask.onHeadersReceived((...args: any[]) => {
            ApplyFunctions(onHeadersReceivedMethods, args);
          });
        }

        if (
          requestTask.offHeadersReceived &&
          offHeadersReceivedMethods.length
        ) {
          requestTask.offHeadersReceived((...args: any[]) => {
            ApplyFunctions(offHeadersReceivedMethods, args);
          });
        }
      }
      bus.off(busId);
    });
    busId.push(
      bus.on(`abort:${requestId}`, args => {
        abortMethods.push(args);
      }),
      bus.on(`offHeadersReceived:${requestId}`, args => {
        offHeadersReceivedMethods.push(args);
      }),
      bus.on(`onHeadersReceived:${requestId}`, args => {
        onHeadersReceivedMethods.push(args);
      })
    );
    return notifyEvent;
  }
}

export const request = CreateRequestWithLazyLoadRequestTask();

function ApplyFunctions(fns: any[], args: any[] = []) {
  for (const fn of fns) {
    fn.apply(this, args);
  }
}
