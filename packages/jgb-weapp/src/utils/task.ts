export type IExecutor = (resolve?: any, reject?: any) => any;

export default class PromiseTask<T> {
  private res: (value?: T | PromiseLike<T>) => void;
  private rej: (reason?: any) => void;
  private readonly promise: Promise<T>;

  progress: (cb: any) => this;
  abort: (cb: any) => this;

  constructor(executor: IExecutor) {
    this.promise = new Promise(executor);
  }

  then(
    onfulfilled?: (value: T) => T | PromiseLike<T>,
    onrejected?: (reason: any) => PromiseLike<never>
  ): Promise<T> {
    return this.promise.then(onfulfilled, onrejected);
  }

  catch(onRejected?: (reason: any) => PromiseLike<never>): Promise<T> {
    return this.promise.catch(onRejected);
  }

  resolve(value?: T | PromiseLike<T>): void {
    return this.res(value);
  }

  reject(reason?: any): void {
    return this.rej(reason);
  }
}
