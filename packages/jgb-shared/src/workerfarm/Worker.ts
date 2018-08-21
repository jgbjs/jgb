import * as childProcess from 'child_process';
import { EventEmitter } from 'events';
import { jsonToError } from './errorUtils';

let WORKER_ID = 0;

const childModule: any = require.resolve('../../lib/workerfarm/child');

export default class Worker extends EventEmitter {
  id: number;
  sendQueue: any[] = [];
  processQueue = true;
  calls = new Map();
  exitCode: any;
  callId = 0;
  ready = false;
  stopped = false;
  isStopping = false;
  child: any;

  constructor(private options: any) {
    super();
    this.id = WORKER_ID++;
  }

  async fork(forkModule: string, bundlerOptions: any) {
    const filteredArgs = process.execArgv.filter(
      v => !/^--(debug|inspect)/.test(v)
    );

    const options = {
      execArgv: filteredArgs,
      env: process.env,
      cwd: process.cwd()
    };

    this.child = childProcess.fork(childModule, process.argv, options);

    this.child.on('message', this.receive.bind(this));

    this.child.once('exit', (code: any) => {
      this.exitCode = code;
      this.emit('exit', code);
    });

    this.child.on('error', (err: any) => {
      this.emit('error', err);
    });

    await new Promise((resolve, reject) => {
      this.call({
        method: 'childInit',
        args: [forkModule],
        retries: 0,
        resolve,
        reject
      });
    });

    await this.init(bundlerOptions);
  }

  async init(bundlerOptions: any) {
    this.ready = false;

    return new Promise((resolve, reject) => {
      this.call({
        method: 'init',
        args: [
          {
            ...bundlerOptions,
            parser: null
          }
        ],
        retries: 0,
        resolve: (...args: any[]) => {
          this.ready = true;
          this.emit('ready');
          resolve(...args);
        },
        reject
      });
    });
  }

  send(data: any) {
    if (!this.processQueue) {
      return this.sendQueue.push(data);
    }

    const result = this.child.send(data, (error: any) => {
      if (error && error instanceof Error) {
        // Ignore this, the workerfarm handles child errors
        return;
      }

      this.processQueue = true;

      if (this.sendQueue.length > 0) {
        const queueCopy = this.sendQueue.slice(0);
        this.sendQueue = [];
        queueCopy.forEach(entry => this.send(entry));
      }
    });

    if (!result || /^win/.test(process.platform)) {
      // Queue is handling too much messages throttle it
      this.processQueue = false;
    }
  }

  call(call: any) {
    if (this.stopped || this.isStopping) {
      return;
    }

    const idx = this.callId++;
    this.calls.set(idx, call);

    this.send({
      idx,
      type: 'request',
      child: this.id,
      method: call.method,
      args: call.args
    });
  }

  receive(data: any) {
    if (this.stopped || this.isStopping) {
      return;
    }

    const idx = data.idx;
    const type = data.type;
    const content = data.content;
    const contentType = data.contentType;

    if (type === 'request') {
      this.emit('request', data);
    } else if (type === 'response') {
      const call = this.calls.get(idx);
      if (!call) {
        // Return for unknown calls, these might accur if a third party process uses workers
        return;
      }

      if (contentType === 'error') {
        call.reject(jsonToError(content));
      } else {
        call.resolve(content);
      }

      this.calls.delete(idx);
      this.emit('response', data);
    }
  }

  async stop() {
    if (!this.stopped) {
      this.stopped = true;

      if (this.child) {
        this.child.send('die');

        const forceKill = setTimeout(
          () => this.child.kill('SIGINT'),
          this.options.forcedKillTime
        );
        await new Promise(resolve => {
          this.child.once('exit', resolve);
        });

        clearTimeout(forceKill);
      }
    }
  }
}
