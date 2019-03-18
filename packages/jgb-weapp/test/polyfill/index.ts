// @ts-ignore
global.wx = {
  /**
   * 模拟异步接口
   *    统一延迟100ms返回
   * @param opts
   */
  request(opts: any) {
    const { success, fail, complete } = opts;
    const onHeadersReceivedFns = [] as any[];
    const timers: any[] = [];
    if (opts.isfail) {
      const timer = setTimeout(() => {
        fail &&
          fail({
            err: 0
          });
      }, 100);
      timers.push(timer);
    } else {
      const timer = setTimeout(() => {
        success &&
          success({
            data: {
              test: 1,
              opts
            },
            statusCode: 200,
            header: {}
          });
      }, 100);
      timers.push(timer);
    }

    const timer = setTimeout(() => {
      ApplyFunctions(onHeadersReceivedFns, [
        {
          header: {}
        }
      ]);
      complete && complete();
    }, 101);
    timers.push(timer);
    return {
      abort() {
        for (const t of timers) {
          clearTimeout(t);
        }

        fail &&
          fail({
            err: 0
          });

        complete && complete();
      },
      onHeadersReceived(cb: any) {
        onHeadersReceivedFns.push(cb);
      },
      offHeadersReceived(cb: any) {
        onHeadersReceivedFns.length = 0;
      }
    };
  },
  getStorageSync(key: string) {
    return {
      test: key
    };
  },
  createMapContext(mapId: string, ctx?: any) {
    return {
      mapId,
      ctx
    };
  },
  nextTick(cb: any) {
    Promise.resolve().then(cb);
  },
  connectSocket(opts: any) {
    setTimeout(() => {
      opts.success && opts.success();
    });

    return {
      send(opts: any) {
        const { data, success } = opts;
        success(data);
      }
    };
  }
};

function ApplyFunctions(fns: Array<any>, args: any[] = []) {
  for (const fn of fns) {
    fn.apply(this, args);
  }
}
