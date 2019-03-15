import { IEventBus, IEventFunction } from '../types/eventbus';

export const STORE = Symbol('stores');

let uuid = 0;

function getNewUUID() {
  return uuid++;
}

interface IStoreModel {
  ctx: any;
  identifyId: number;
  cb: IEventFunction;
}

class EventBus implements IEventBus {
  [STORE] = new Map<string, IStoreModel[]>();
  on(events: any, fn: IEventFunction, ctx?: any): any {
    if (typeof fn !== 'function') {
      console.error('fn must be a function');
      return;
    }

    if (Array.isArray(events)) {
      const identifyIdArr: number[] = [];
      for (const event of new Set(events)) {
        identifyIdArr.push(...this.on(event, fn, ctx));
      }
      return identifyIdArr;
    }

    const stores = this[STORE].get(events) || [];
    const identifyId = getNewUUID();
    stores.push({
      ctx,
      identifyId,
      cb: fn
    });

    this[STORE].set(events, stores);
    return identifyId;
  }

  once(events: any, fn: IEventFunction, ctx?: any) {
    const identifyIdArr: number[] = [];
    if (Array.isArray(events)) {
      // tslint:disable-next-line:no-shadowed-variable
      for (const event of new Set(events)) {
        identifyIdArr.push(...this.once(event, fn, ctx));
      }
      return identifyIdArr;
    }

    const event = events;

    const identifyId = this.on(event, fn);

    const offId = this.on(event, () => {
      this.indentifyIdOff([identifyId, offId]);
    });

    return identifyId;
  }

  emit(event: string | string[], ...args: any[]) {
    if (Array.isArray(event)) {
      event.forEach(ev => this.emit(ev, ...args));
      return;
    }

    let store = this[STORE].get(event);
    if (store) {
      store = store.slice(0);
      for (let i = 0, len = store.length; i < len; i++) {
        store[i].cb.apply(store[i].ctx, args);
      }
    }
  }

  async emitAsync(event: string | string[], ...args: any[]) {
    if (Array.isArray(event)) {
      for (const ev of new Set(event)) {
        await this.emitAsync(ev, ...args);
      }
      return;
    }

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

  private indentifyIdOff(events: number | number[]) {
    const entries = this[STORE].entries();
    const ids: number[] = [].concat(events);

    for (let [key, values] of entries) {
      values = values.filter(value => {
        const id = value.identifyId;
        if (ids.includes(id)) {
          return false;
        }

        return true;
      });

      if (values.length === 0) {
        this[STORE].delete(key);
      } else {
        this[STORE].set(key, values);
      }
    }
  }

  off(event?: string | number | number[], fn?: IEventFunction) {
    if (!event) {
      this[STORE] = new Map();
    }

    if (typeof event !== 'string') {
      return this.indentifyIdOff(event);
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

    // remove store when events length zero
    if (store.length === 0) {
      this[STORE].delete(event);
    }
  }
}

export default EventBus;

export const bus = new EventBus();
