export type IEventFunction = (...data: any[]) => any;

const STORE = Symbol('stores');

class EventBus {
  [STORE] = new Map();
  on(event: string, fn: IEventFunction, ctx?: any) {
    if (typeof fn !== 'function') {
      console.error('fn must be a function');
      return;
    }

    const stores = this[STORE].get(event) || [];
    stores.push({
      ctx,
      cb: fn
    });

    this[STORE].set(event, stores);
  }

  once(event: string, fn: IEventFunction, ctx?: any) {
    this.on(event, fn, ctx);
    this.on(event, () => {
      this.off(event, fn);
    });
  }

  emit(event: string, ...args: any[]) {
    let store = this[STORE].get(event);
    if (store) {
      store = store.slice(0);
      for (let i = 0, len = store.length; i < len; i++) {
        store[i].cb.apply(store[i].ctx, args);
      }
    }
  }

  async emitAsync(event: string, ...args: any[]) {
    const store = this[STORE].get(event);
    if (!store) {
      return;
    }

    const tasks = [];

    for (let i = 0, len = store.length; i < len; i++) {
      tasks.push(Promise.resolve(store[i].cb.apply(store[i].ctx, args)));
    }

    await Promise.all(tasks);
  }

  off(event?: string, fn?: IEventFunction) {
    if (!event) {
      this[STORE] = new Map();
    }
    const store = this[STORE].get(event);
    if (!store) {
      return;
    }
    // remove all handlers
    if (arguments.length === 1) {
      this[STORE].delete(event);
      return;
    }
    // remove specific handler
    let cb;
    for (let i = 0, len = store.length; i < len; i++) {
      cb = store[i].cb;
      if (cb === fn) {
        store.splice(i, 1);
        break;
      }
    }
  }
}

export default EventBus;

export const bus = new EventBus();
