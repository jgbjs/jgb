import { IEventFunction } from '../types/eventbus';
import { bus } from './EventBus';
import nextTick from './utils/nextTick';

export const event = '$events$';

export default class JBase {
  /* 当前绑定事件集合 */
  private [event]: Array<{
    evtName: string;
    fn: IEventFunction;
  }>;

  constructor() {
    if (this) {
      this[event] = [];
    }
  }

  $on(evtName: string, fn: IEventFunction) {
    bus.on(evtName, fn);
    this[event].push({
      evtName,
      fn
    });
  }

  $once(evtName: string, fn: IEventFunction) {
    bus.once(evtName, fn);
    this[event].push({
      evtName,
      fn
    });
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

  /* 清除所有当前绑定的事件 */
  $destory() {
    const events = this[event];
    // 下一帧执行, 避免事件被提前销毁
    nextTick(() => {
      while (events.length) {
        const { evtName, fn } = events.pop();
        bus.off(evtName, fn);
      }
    });
    this[event] = [];
  }
}
