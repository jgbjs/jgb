import { errorToJson, jsonToError } from './errorUtils';

class Child {
  module: any;
  childId: number;
  callQueue: any[] = [];
  responseQueue = new Map();
  responseId = 0;
  maxConcurrentCalls = 10;

  constructor() {
    if (!process.send) {
      throw new Error('Only create Child instances in a worker!');
    }
  }

  messageListener(data: any) {
    if (data === 'die') {
      return this.end();
    }

    const type = data.type;
    if (type === 'response') {
      return this.handleResponse(data);
    } else if (type === 'request') {
      return this.handleRequest(data);
    }
  }

  async send(data: any) {
    process.send(data, (err: any) => {
      if (err && err instanceof Error) {
        if ((err as any).code === 'ERR_IPC_CHANNEL_CLOSED') {
          // IPC connection closed
          // no need to keep the worker running if it can't send or receive data
          return this.end();
        }
      }
    });
  }

  childInit(module: string, childId: number) {
    this.module = require(module);
    this.childId = childId;
  }

  async handleRequest(data: any) {
    const idx = data.idx;
    // tslint:disable-next-line:no-shadowed-variable
    const child = data.child;
    const method = data.method;
    const args = data.args;

    const result: IHandleResult = { idx, child, type: 'response' };
    try {
      result.contentType = 'data';
      if (method === 'childInit') {
        result.content = this.childInit(args[0], child);
      } else {
        result.content = await this.module[method](...args);
      }
    } catch (e) {
      result.contentType = 'error';
      result.content = errorToJson(e);
    }

    this.send(result);
  }

  // Keep in mind to make sure responses to these calls are JSON.Stringify safe
  async addCall(request: any, awaitResponse = true) {
    const call = request;
    call.type = 'request';
    call.child = this.childId;
    call.awaitResponse = awaitResponse;

    let promise;
    if (awaitResponse) {
      promise = new Promise((resolve, reject) => {
        call.resolve = resolve;
        call.reject = reject;
      });
    }

    this.callQueue.push(call);
    this.processQueue();

    return promise;
  }

  async handleResponse(data: any) {
    const idx = data.idx;
    const contentType = data.contentType;
    const content = data.content;
    const call = this.responseQueue.get(idx);

    if (contentType === 'error') {
      call.reject(jsonToError(content));
    } else {
      call.resolve(content);
    }

    this.responseQueue.delete(idx);

    // Process the next call
    this.processQueue();
  }

  async sendRequest(call: any) {
    let idx;
    if (call.awaitResponse) {
      idx = this.responseId++;
      this.responseQueue.set(idx, call);
    }
    this.send({
      idx,
      child: call.child,
      type: call.type,
      location: call.location,
      method: call.method,
      args: call.args,
      awaitResponse: call.awaitResponse
    });
  }

  async processQueue() {
    if (!this.callQueue.length) {
      return;
    }

    if (this.responseQueue.size < this.maxConcurrentCalls) {
      this.sendRequest(this.callQueue.shift());
    }
  }

  end() {
    process.exit();
  }
}

const child = new Child();

process.on('message', child.messageListener.bind(child));

export default child;

interface IHandleResult {
  idx: any;
  child: any;
  type: string;
  contentType?: string;
  content?: any;
}
