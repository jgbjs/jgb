const TYPE_KEYNAME =
  typeof Symbol === 'function'
    ? Symbol('--[[await-event-emitter]]--')
    : '--[[await-event-emitter]]--';

function assertType(type: string) {
  if (typeof type !== 'string' && typeof type !== 'symbol') {
    throw new TypeError('type is not type of string or symbol!');
  }
}

function isPromise(obj: any) {
  return (
    !!obj &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function'
  );
}

function assertFn(fn: IEmitterFunction) {
  if (typeof fn !== 'function') {
    throw new TypeError('fn is not type of Function!');
  }
}

function alwaysListener(fn: IEmitterFunction) {
  return {
    [TYPE_KEYNAME]: 'always',
    fn
  };
}
function onceListener(fn: IEmitterFunction) {
  return {
    [TYPE_KEYNAME]: 'once',
    fn
  };
}

export default class AwaitEventEmitter {
  // tslint:disable-next-line:variable-name
  _events: any = {};
  on(type: string, fn: IEmitterFunction) {
    assertType(type);
    assertFn(fn);
    this._events[type] = this._events[type] || [];
    this._events[type].push(alwaysListener(fn));
    return this;
  }

  off(type: string, nullOrFn: void | IEmitterFunction) {
    assertType(type);

    const listeners = this.listeners(type);
    if (typeof nullOrFn === 'function') {
      // tslint:disable-next-line:one-variable-per-declaration
      let index,
        found = false;
      // tslint:disable-next-line:no-conditional-assignment
      while ((index = listeners.indexOf(nullOrFn)) >= 0) {
        listeners.splice(index, 1);
        this._events[type].splice(index, 1);
        found = true;
      }
      return found;
    } else {
      return delete this._events[type];
    }
  }

  once(type: string, fn: IEmitterFunction) {
    assertType(type);
    assertFn(fn);
    this._events[type] = this._events[type] || [];
    this._events[type].push(onceListener(fn));
    return this;
  }

  listeners(type: string) {
    return (this._events[type] || []).map((x: any) => x.fn);
  }

  async emit(type: string, ...args: any[]) {
    assertType(type);
    // tslint:disable-next-line:no-shadowed-variable
    const listeners = this.listeners(type);

    const onceListeners = [];
    if (listeners && listeners.length) {
      for (let i = 0; i < listeners.length; i++) {
        const event = listeners[i];
        const rlt = event.apply(this, args);
        if (isPromise(rlt)) {
          await rlt;
        }
        if (this._events[type][i][TYPE_KEYNAME] === 'once') {
          onceListeners.push(event);
        }
      }
      onceListeners.forEach(event => this.off(type, event));

      return true;
    }
    return false;
  }

  emitSync(type: string, ...args: any[]) {
    assertType(type);
    // tslint:disable-next-line:no-shadowed-variable
    const listeners = this.listeners(type);
    const onceListeners = [];
    if (listeners && listeners.length) {
      for (let i = 0; i < listeners.length; i++) {
        const event = listeners[i];
        event.apply(this, args);

        if (this._events[type][i][TYPE_KEYNAME] === 'once') {
          onceListeners.push(event);
        }
      }
      onceListeners.forEach(event => this.off(type, event));

      return true;
    }
    return false;
  }
}

type IEmitterFunction = (...args: any[]) => any;
