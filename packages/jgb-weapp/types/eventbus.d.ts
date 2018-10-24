export type IEventFunction = (...data: any[]) => any;

export interface IEventBus {
  on(event: string, fn: IEventFunction, ctx?: any): void;
  once(event: string, fn: IEventFunction, ctx?: any): void;
  emit(event: string, ...args: any[]): void;
  emitAsync(event: string, ...args: any[]): Promise<void>;
  off(event?: string, fn?: IEventFunction): void;
}

export interface INewEventBus {
  $on: IEventBus['on'];
  $once: IEventBus['once'];
  $emit: IEventBus['emit'];
  $emitAsync: IEventBus['emitAsync'];
  $off: IEventBus['off'];
}
