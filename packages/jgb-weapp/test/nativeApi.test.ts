import initNativeApi from '../src/native-api';
import { intercepts } from '../src/native-api/intercept';
import './polyfill';

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

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
      await jgb.request({
        url: 'test',
        isfail: true
      });
    } catch (error) {
      expect(error.errorCode).toBe(0);
    }
  });

  test('request abort', async () => {
    expect.assertions(1);

    const jgb = init();
    let t = 1;
    const r = jgb.request({
      url: `test`,
      success() {
        t = 2;
      }
    });

    try {
      r.abort();
    } catch (error) {
      console.log('e', error);
    }

    r.then(
      (value: any) => {},
      (value: any) => {
        console.error(value);
      }
    );

    return new Promise(resolve => {
      setTimeout(() => {
        expect(t).toBe(1);
        resolve();
      }, 200);
    });
  });

  test('async intercept', async () => {
    const jgb = init();
    let t = 1;
    jgb.intercept('request', 'begin', (opts: any) => {
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

    const res = await jgb.request(requestOpts);

    expect(t).toBe(2);
    expect(res.data.opts.url).toBe(`test2`);
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

describe('intercept:common', () => {
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

  test(`nextTick no in native-api config`, async () => {
    const jgb = init();
    let t = 1;
    jgb.nextTick(() => {
      t = 2;
    });
    expect(t).toBe(1);
    await sleep(10);
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
