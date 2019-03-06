import initNativeApi, { intercepts } from '../src/native-api';

// @ts-ignore
global.wx = {
  /**
   * 模拟异步接口
   *    统一延迟100ms返回
   * @param opts
   */
  request(opts: any) {
    const { success, fail, complete } = opts;
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
      complete && complete();
    }, 101);
    timers.push(timer);
    return {
      abort() {
        for (const t of timers) {
          clearTimeout(t);
        }
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

function init(jgb: any = {}) {
  initNativeApi(jgb);
  return jgb;
}

describe('otherApis: request intercept', () => {
  test('intercept begin', async () => {
    const jgb = init();
    jgb.intercept('request', 'begin', (opts: any) => {
      opts.header = Object.assign({}, opts.header, {
        test: 'test'
      });
      return opts;
    });

    const result = await jgb.request({
      url: 'test'
    });

    expect(result.data.test).toBe(1);
    expect(result.data.opts.header.test).toBe('test');
  });

  test('intercept success', async () => {
    const jgb = init();
    jgb.intercept('request', 'success', (result: any) => {
      return result.data;
    });

    const result = await jgb.request({
      url: 'test'
    });

    expect(result.test).toBe(1);
  });

  test('intercept success with no return', async () => {
    const jgb = init();
    jgb.intercept('request', 'success', (result: any) => {});

    const result = await jgb.request({
      url: 'test'
    });

    expect(result.data.test).toBe(1);
  });

  test('intercept fail', async () => {
    const jgb = init();
    jgb.intercept('request', 'fail', (result: any) => {
      return { errorCode: result.err };
    });

    try {
      const result = await jgb.request({
        url: 'test',
        isfail: true
      });
    } catch (error) {
      expect(error.errorCode).toBe(0);
    }
  });

  test('request abort', () => {
    const jgb = init();
    let t = 1;
    jgb
      .request({
        url: `test`,
        success() {
          t = 2;
        }
      })
      .abort();

    setTimeout(() => {
      expect(t).toBe(1);
    }, 200);
  });

  test('async intercept', async () => {
    const jgb = init();
    let t = 1;
    jgb.intercept('request', 'begin', async (opts: any) => {
      return new Promise(resolve => {
        setTimeout(() => {
          opts.url = `test2`;
          resolve(opts);
        }, 100);
      });
    });

    const requestOpts = {
      url: `test`,
      success() {
        t = 2;
      }
    };

    setTimeout(() => {
      expect(t).toBe(1);
      expect(requestOpts.url).toBe(`test2`);
    }, 101);

    jgb.request(requestOpts).then((res: any) => {
      expect(t).toBe(2);
      expect(res.data.opts.url).toBe(`test2`);
    });

    expect(requestOpts.url).toBe(`test`);
  });
});

describe('onAndSyncApis: getStorageSync intercept', () => {
  test('intercept begin', () => {
    const jgb = init();
    jgb.intercept('getStorageSync', 'begin', (opts: any) => {
      return 'value2';
    });

    const result = jgb.getStorageSync('value');
    expect(result.test).toBe('value2');
  });

  test('intercept begin with no return', () => {
    const jgb = init();
    jgb.intercept('getStorageSync', 'begin', (opts: any) => {});

    const result = jgb.getStorageSync('value');
    expect(result.test).toBe('value');
  });

  test('intercept success', () => {
    const jgb = init();
    jgb.intercept('getStorageSync', 'success', (result: any) => {
      return {
        test: result.test + '1'
      };
    });

    const result = jgb.getStorageSync('value');
    expect(result.test).toBe('value1');
  });

  test('intercept success with no return', () => {
    const jgb = init();
    jgb.intercept('getStorageSync', 'success', (result: any) => {});

    const result = jgb.getStorageSync('value');
    expect(result.test).toBe('value');
  });
});

describe('intercept common', () => {
  test('add intercept', () => {
    intercepts.clear();
    const jgb = init();
    jgb.intercept('request', (opts: any) => {
      return opts;
    });

    expect(intercepts.get('request').length).toBe(1);
  });

  test('remove intercept', () => {
    intercepts.clear();
    expect(intercepts.size).toBe(0);
    const jgb = init();
    jgb.intercept('request', (opts: any) => {
      return opts;
    });
    expect(intercepts.get('request').length).toBe(1);
    jgb.intercept('request');

    expect(intercepts.get('request')).toBeUndefined();
  });

  test('intercept createMapContext', () => {
    const jgb = init();
    jgb.intercept('createMapContext', () => {});
    const ctx = jgb.createMapContext('id', 1);

    expect(ctx.mapId).toBe('id');
    expect(ctx.ctx).toBe(1);
  });

  test(`nextTick no in native-api config`, () => {
    const jgb = init();
    let t = 1;
    jgb.nextTick(() => {
      t = 2;
    });
    expect(t).toBe(1);
  });

  test(`connectSocket`, async () => {
    const jgb = init();
    const task = await jgb.connectSocket();
    task.send({
      data: 1,
      success(res: any) {
        expect(res).toBe(1);
      }
    });
  });
});
