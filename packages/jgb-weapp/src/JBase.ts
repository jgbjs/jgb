import { eventBus, IEventFunction } from './EventBus';
export default class JBase {
  $on(evtName: string, fn: IEventFunction) {
    eventBus.on(evtName, fn);
  }
  $once(evtName: string, fn: IEventFunction) {
    eventBus.once(evtName, fn);
  }
  $emit(...data: any[]) {
    eventBus.emit(...data);
  }
  $off(evtName?: string, fn?: IEventFunction) {
    eventBus.off(evtName, fn);
  }
}
