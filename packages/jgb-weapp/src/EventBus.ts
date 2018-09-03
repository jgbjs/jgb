export type IEventFunction = (...data: any[]) => void;

class EventBus {
  // tslint:disable-next-line:no-empty
  on(evtName: string, fn: IEventFunction) {}
  // tslint:disable-next-line:no-empty
  once(evtName: string, fn: IEventFunction) {}
  // tslint:disable-next-line:no-empty
  emit(...data: any[]) {}
  // tslint:disable-next-line:no-empty
  off(evtName?: string, fn?: IEventFunction) {}
}

export default EventBus;

export const eventBus = new EventBus();
