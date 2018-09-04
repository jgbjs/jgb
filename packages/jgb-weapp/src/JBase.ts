import { bus, IEventFunction } from './EventBus';
export default class JBase {
  $on(evtName: string, fn: IEventFunction) {
    bus.on(evtName, fn);
  }

  $once(evtName: string, fn: IEventFunction) {
    bus.once(evtName, fn);
  }

  $emit(evtName: string, ...data: any[]) {
    bus.emit(evtName, ...data);
  }

  async $emitAsync(evtName: string, ...data: any[]) {
    await bus.emitAsync(evtName, ...data);
  }

  $off(evtName?: string, fn?: IEventFunction) {
    bus.off(evtName, fn);
  }
}
