import { STORE } from '../src/EventBus';
import { CreateRequestWithLazyLoadRequestTask, RequestQueue } from '../src/native-api/network';
import './polyfill';

const sleep = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

describe('RequestQueue', () => {
  test('MAX limit', async () => {
    const requestQueue = new RequestQueue();
    requestQueue.MAX = 2;
    let count = 3;
    while (count--) {
      requestQueue.request({
        url: `${count}`
      });
    }

    expect(requestQueue.queue.length).toBe(1);
  });

  test('clear request queue when request done', async () => {
    const requestQueue = new RequestQueue();
    requestQueue.MAX = 2;
    let count = 4;
    const tasks = [] as any[];
    while (count--) {
      const task = new Promise(resolve => {
        requestQueue.request({
          url: `${count}`,
          complete() {
            resolve();
          }
        });
      });
      tasks.push(task);
    }

    await Promise.all(tasks);

    expect(requestQueue.running).toBe(0);
    expect(requestQueue.readyRequestTasks.size).toBe(0);
  });

  test('async return requestTask', async () => {
    const requestQueue = new RequestQueue();
    const task = await requestQueue.request({
      url: `1`
    });

    expect(task).not.toBeUndefined();
    expect(typeof task.abort === 'function').toBe(true);
  });
});

describe('CreateRequestWithLazyLoadRequestTask', () => {
  const request = CreateRequestWithLazyLoadRequestTask();
  test('enable get result', async () => {
    const result = await request({
      url: '1'
    });
    expect(result.data.opts.url).toBe('1');
  });

  test('MAX', async () => {
    const rq = CreateRequestWithLazyLoadRequestTask();

    rq.Max = 2;

    let count = 4;
    const tasks = [] as any[];
    const startDate = Date.now();
    while (count--) {
      const task = new Promise(resolve => {
        rq({
          url: `${count}`,
          complete() {
            resolve();
          }
        });
      });
      tasks.push(task);
    }

    await Promise.all(tasks);

    const d = Date.now() - startDate;

    expect(d).toBeGreaterThan(200);
  });

  test('remove eventbus when request done.', async () => {
    const requestScope = CreateRequestWithLazyLoadRequestTask();
    expect(requestScope.bus![STORE].size).toBe(0);
    const result = await requestScope({
      url: '1'
    });

    await sleep(1);
    expect(requestScope.bus![STORE].size).toBe(0);
  });

  test('abort immediate', async () => {
    const resultAsync = request({
      url: '1'
    });

    let result: any;
    let error = 0;

    resultAsync.then(
      value => {
        result = value;
      },
      () => {
        error = 1;
      }
    );

    resultAsync.abort();

    await sleep(200);

    expect(result).toBeUndefined();
    expect(error).toBe(1);
  });

  test('abort when inited', async () => {
    const resultAsync = request({
      url: '1'
    });

    let result: any;
    let error = 0;

    resultAsync.then(
      value => {
        result = value;
      },
      () => {
        error = 1;
      }
    );

    await sleep(10);
    resultAsync.abort();

    expect(result).toBeUndefined();
    await sleep(1);
    expect(error).toBe(1);
  });

  test('onHeadersReceived immediate', async () => {
    const resultAsync = request({
      url: '1'
    });

    await new Promise(resolve => {
      resultAsync.onHeadersReceived(res => {
        expect(res.header).not.toBeUndefined();
        resolve();
      });
    });
  });

  test('onHeadersReceived when inited', async () => {
    const resultAsync = request({
      url: '1'
    });

    await sleep(10);

    await new Promise(resolve => {
      resultAsync.onHeadersReceived(res => {
        expect(res.header).not.toBeUndefined();
        resolve();
      });
    });
  });
});
