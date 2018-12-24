export type IEventFunction = (...data: any[]) => any;

export interface IEventBus {
  on(event: string, fn: IEventFunction, ctx?: any): number;
  on(event: string[], fn: IEventFunction, ctx?: any): number[];

  once(event: string, fn: IEventFunction, ctx?: any): number;
  once(event: string[], fn: IEventFunction, ctx?: any): number[];

  emit(event: string | string[], ...args: any[]): void;
  emitAsync(event: string | string[], ...args: any[]): Promise<void>;

  off(event?: string, fn?: IEventFunction): void;
  off(events?: number | number[]): void;
}

export interface INewEventBus {
  $on: IEventBus['on'];
  $once: IEventBus['once'];
  $emit: IEventBus['emit'];
  $emitAsync: IEventBus['emitAsync'];
  $off: IEventBus['off'];
}
