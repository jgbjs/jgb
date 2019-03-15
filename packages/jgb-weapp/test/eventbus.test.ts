import EventBus, { STORE } from '../src/EventBus';

describe('eventbus:emit', () => {
  test('emit when on', () => {
    const bus = new EventBus();
    bus.on('test', data => {
      expect(data).toBe(1);
    });

    bus.emit('empty');

    bus.emit('test', 1);
  });

  test('emit twice when on', () => {
    const bus = new EventBus();
    let index = 0;
    bus.on('test', data => {
      expect(data).toBe(++index);
    });

    bus.emit('test', 1);

    return new Promise(resolve => {
      bus.emit('test', 2);
      resolve();
    });
  });

  test('emit async function', async () => {
    const bus = new EventBus();
    let index = 0;
    const fn = async (data: any) => {
      await sleep(100);
      index = data;
    };
    const fn1 = async (data: any) => {
      index += data + 1;
      await sleep(150);
    };

    bus.on('test', fn);

    const [id1] = bus.on(['test2', 'test3'], fn1);

    const task1 = bus.emitAsync('test', 1);

    expect(index).toBe(0);
    await task1;
    expect(index).toBe(1);

    // remove test2
    bus.off(id1);

    await bus.emitAsync(['test', 'test2', 'test3'], 2);
    bus.emitAsync('empty');

    expect(index).toBe(5);
  });

  test('emit when once', () => {
    const bus = new EventBus();
    let index = 0;
    bus.once('test', (data = 1) => {
      index = data;
    });

    bus.once(['test1', 'test2'], () => {
      index += 1;
    });

    bus.emit('test', 1);

    bus.emit('test', 2);

    expect(index).toBe(1);

    return new Promise(resolve => {
      bus.emit(['test', 'test1', 'test2']);
      expect(index).toBe(3);
      resolve();
    });
  });
});

describe('eventbus:off', () => {
  const bus = new EventBus();
  let index = 0;
  const fn = (data: any) => {
    index = data;
  };
  const fn1 = (data: any) => {
    index = data;
  };

  bus.on('test', fn);

  const [id1, id2] = bus.on(['test2', 'test3', 'test4'], fn1);

  test('off with function', () => {
    // off test with fn
    bus.emit('test', 1);

    bus.off('test', fn);
    expect(bus[STORE].get('test')).toBeUndefined();
  });

  test('off with id', () => {
    // off test2 with id

    bus.emit('test2', 3);

    bus.off(id1);

    bus.emit('test2', 4);

    expect(index).toBe(3);
  });

  test('off with array id', () => {
    // off test3 with array id

    bus.emit(['test3'], 5);

    bus.off([id1, id2]);
    console.log();
    bus.emit(['test3'], 6);

    expect(index).toBe(5);
  });

  test('off when has multiple events', () => {
    // off test4 when test4 has multiple events
    bus.on('test4', fn);
    expect(bus[STORE].get('test4').length).toBe(2);

    bus.off('test4', fn);

    expect(bus[STORE].get('test4').length).toBe(1);

    bus.off('test4', fn1);

    expect(bus[STORE].get('test4')).toBeUndefined();
  });

  test('no event will be off', () => {
    // no event will be off
    const storeSize = bus[STORE].size;
    bus.off('empty');
    expect(bus[STORE].size).toBe(storeSize);
  });

  test('off with one params', () => {
    // off test with no arguments[1]
    const storeSize = bus[STORE].size;
    bus.off('test');
    expect(bus[STORE].size).toBe(Math.max(storeSize - 1, 0));
  });

  test('off all', () => {
    bus.off();
    expect(bus[STORE].size).toBe(0);
  });
});

describe('eventbus:on', () => {
  test('events is string', () => {
    const bus = new EventBus();
    bus.on('test', () => console.log(1));
    expect(bus[STORE].size).toBe(1);
    expect(bus[STORE].get('test').length).toBe(1);
  });

  test('events is string[]', () => {
    const bus = new EventBus();
    bus.on(['test', 'test1'], () => console.log(1));
    expect(bus[STORE].size).toBe(2);
  });

  test('fn is undefined', () => {
    const bus = new EventBus();
    try {
      // @ts-ignore
      bus.on('test');
    } catch (error) {
      //
    }

    expect(bus[STORE].size).toBe(0);
  });

  test('once', () => {
    const bus = new EventBus();
    bus.once('once', () => {});
    expect(bus[STORE].size).toBe(1);
    bus.emit('once');
    expect(bus[STORE].size).toBe(0);
  });
});

async function sleep(time: number) {
  return new Promise(resolve =>
    setTimeout(() => {
      resolve();
    }, time)
  );
}
