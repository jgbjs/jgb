import { EventEmitter } from 'events';
import * as os from 'os';
import * as osUtil from 'os-utils';
import Asset from '../Asset';
import { logger } from '../Logger';
import { debounce, throttle } from '../utils/decorator';
import { errorToJson } from './errorUtils';
import Worker from './Worker';

let shared: WorkerFarm = null;

export default class WorkerFarm extends EventEmitter {
  options: any;
  warmWorkers = 0;
  cpuUsage = 0;
  workers = new Map<number, Worker>();
  callQueue: any[] = [];
  localWorker: any;
  run: (asset: Asset | string, distPath: string) => any;
  ending: boolean;
  bundlerOptions: any;

  constructor(options: any, farmOptions: any = {}) {
    super();

    this.options = Object.assign(
      {
        maxConcurrentWorkers: 1, // WorkerFarm.getNumWorkers(),
        maxConcurrentCallsPerWorker: WorkerFarm.getConcurrentCallsPerWorker(),
        forcedKillTime: 500,
        warmWorkers: true,
        useLocalWorker: true,
        workerPath: '../worker'
      },
      farmOptions
    );

    this.localWorker = require(this.options.workerPath);
    this.run = this.mkhandle('run');

    this.init(options);
  }

  /**
   * Worder热身
   * @param method
   * @param args
   */
  warmupWorker(method: string, args: any) {
    // Workers are already stopping
    if (this.ending) {
      return;
    }

    // Workers are not warmed up yet.
    // Send the job to a remote worker in the background,
    // but use the result from the local worker - it will be faster.
    const promise = this.addCall(method, [...args, true]);
    if (promise) {
      promise
        .then(() => {
          this.warmWorkers++;
          if (this.warmWorkers >= this.workers.size) {
            this.emit('warmedup');
          }
        })
        .catch();
    }
  }

  /**
   * 是否开启远程 Worker
   */
  shouldStartRemoteWorkers() {
    return (
      this.options.maxConcurrentWorkers > 1 ||
      process.env.NODE_ENV === 'test' ||
      !this.options.useLocalWorker
    );
  }

  mkhandle(method: 'init' | 'run'): () => any {
    return (...args: any[]) => {
      // Child process workers are slow to start (~600ms).
      // While we're waiting, just run on the main thread.
      // This significantly speeds up startup time.
      if (this.shouldUseRemoteWorkers()) {
        return this.addCall(method, [...args, false]);
      } else {
        if (this.options.warmWorkers && this.shouldStartRemoteWorkers()) {
          this.warmupWorker(method, args);
        }

        return this.localWorker[method](...args, false);
      }
    };
  }

  onError(error: any, worker: Worker) {
    // Handle ipc errors
    if (error.code === 'ERR_IPC_CHANNEL_CLOSED') {
      return this.stopWorker(worker);
    }
  }

  /**
   * 开启 Worker
   */
  startChild() {
    const worker = new Worker(this.options);

    worker.fork(this.options.workerPath, this.bundlerOptions);

    worker.on('request', data => this.processRequest(data, worker));

    worker.on('ready', () => this.processQueue());
    worker.on('response', () => this.processQueue());

    worker.on('error', err => this.onError(err, worker));
    worker.once('exit', () => this.stopWorker(worker));

    this.workers.set(worker.id, worker);

    logger.info(`started worker id: ${worker.id}.`);
  }

  async stopWorker(worker: Worker) {
    if (!worker.stopped) {
      logger.info(`stopped worker id: ${worker.id}`);
      this.workers.delete(worker.id);

      worker.isStopping = true;

      if (worker.calls.size) {
        for (const call of worker.calls.values()) {
          call.retries++;
          this.callQueue.unshift(call);
        }
      }

      worker.calls = null;

      await worker.stop();

      // Process any requests that failed and start a new worker
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.ending || !this.callQueue.length) {
      return;
    }

    if (this.workers.size < this.options.maxConcurrentWorkers) {
      this.prefStartChild();
    }

    this.prefCpuUsage();

    // 能够工作并且任务量最少优先的worker
    const workers = [...this.workers.values()]
      .filter(worker => !(!worker.ready || worker.stopped || worker.isStopping))
      .sort((w1, w2) => w1.calls.size - w2.calls.size);

    const maxConcurrentCallsPerWorker = this.options
      .maxConcurrentCallsPerWorker;

    for (const worker of workers) {
      if (!this.callQueue.length) {
        break;
      }

      if (worker.calls.size < maxConcurrentCallsPerWorker) {
        worker.call(this.callQueue.shift());
      }
    }
  }

  @debounce(100)
  prefStartChild() {
    if (this.cpuUsage > 0.8) {
      return;
    }
    osUtil.cpuUsage((v: any) => {
      this.cpuUsage = v;
      if (v < 0.8 && this.workers.size < this.options.maxConcurrentWorkers) {
        this.startChild();
      }
    });
  }

  @throttle(1000)
  prefCpuUsage() {
    // 优化cpu占用率
    osUtil.cpuUsage((v: any) => {
      this.cpuUsage = v;
      // 满cpu需要暂停一个进程
      if (v >= 0.99) {
        const [worker] = this.workers.values();
        worker.isStopping = true;
      }

      // cpu空闲可以开启进程
      if (v <= 0.5) {
        const stopedWorkers = [...this.workers.values()].filter(
          worker => worker.isStopping
        );
        if (stopedWorkers.length) {
          stopedWorkers[0].isStopping = false;
        } else {
          this.options.maxConcurrentWorkers++;
        }
      }
    });
  }

  /**
   * 处理请求
   * @param data
   * @param worker
   */
  async processRequest(data: any, worker: Worker | false = false) {
    const result: any = {
      idx: data.idx,
      type: 'response'
    };

    const method = data.method;
    const args = data.args;
    const location = data.location;
    const awaitResponse = data.awaitResponse;

    if (!location) {
      throw new Error('Unknown request');
    }

    // 加载模块
    const mod = require(location);
    try {
      result.contentType = 'data';
      if (method) {
        result.content = await mod[method](...args);
      } else {
        result.content = await mod(...args);
      }
    } catch (e) {
      result.contentType = 'error';
      result.content = errorToJson(e);
    }

    if (awaitResponse) {
      if (worker) {
        worker.send(result);
      } else {
        return result;
      }
    }
  }

  addCall(method: string, args: any) {
    if (this.ending) {
      throw new Error('Cannot add a worker call if workerfarm is ending.');
    }

    return new Promise((resolve, reject) => {
      this.callQueue.push({
        method,
        args,
        retries: 0,
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  async end() {
    this.ending = true;
    await Promise.all(
      Array.from(this.workers.values()).map(worker => this.stopWorker(worker))
    );
    this.ending = false;
    shared = null;
  }

  init(bundlerOptions: any) {
    this.bundlerOptions = bundlerOptions;

    if (this.shouldStartRemoteWorkers()) {
      this.persistBundlerOptions();
    }

    this.localWorker.init(bundlerOptions);
    this.startMaxWorkers();
  }

  persistBundlerOptions() {
    for (const worker of this.workers.values()) {
      worker.init(this.bundlerOptions);
    }
  }

  startMaxWorkers() {
    // Starts workers untill the maximum is reached
    if (this.workers.size < this.options.maxConcurrentWorkers) {
      for (
        let i = 0;
        i < this.options.maxConcurrentWorkers - this.workers.size;
        i++
      ) {
        this.startChild();
      }
    }
  }

  shouldUseRemoteWorkers() {
    return (
      !this.options.useLocalWorker ||
      (this.warmWorkers >= this.workers.size || !this.options.warmWorkers)
    );
  }

  /**
   * 获取共享WorkerFarm
   * @param options
   */
  static getShared(options?: any, farmOptions?: any) {
    if (!shared) {
      shared = new WorkerFarm(options, farmOptions);
    } else if (options) {
      shared.init(options);
    }

    if (!shared && !options) {
      throw new Error('Workerfarm should be initialised using options');
    }

    return shared;
  }

  /**
   * 获取cpu核心数
   * 如果配置了process.env.JGB_WORKERS则取其
   * @default process.env.JGB_WORKERS || cpus
   */
  static getNumWorkers() {
    if (process.env.JGB_WORKERS) {
      return parseInt(process.env.JGB_WORKERS, 10);
    }

    let cores;
    try {
      cores = require('physical-cpu-count');
    } catch (err) {
      cores = os.cpus().length;
    }
    return cores || 1;
  }

  static callMaster(request: any, awaitResponse = true) {
    if (WorkerFarm.isWorker()) {
      let child = require('./child');
      child = child.default || child;
      return child.addCall(request, awaitResponse);
    } else {
      return WorkerFarm.getShared().processRequest(request);
    }
  }

  static isWorker() {
    return process.send && require.main.filename === require.resolve('./child');
  }

  /**
   * 每个Worker并发数
   *
   * @default process.env.JGB_MAX_CONCURRENT_CALLS || 1
   */
  static getConcurrentCallsPerWorker() {
    return parseInt(process.env.JGB_MAX_CONCURRENT_CALLS, 10) || 1;
  }
}
