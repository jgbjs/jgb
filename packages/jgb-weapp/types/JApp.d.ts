import { DefaultData } from "./common";
import { IEventBus, IEventFunction, INewEventBus } from "./eventbus";

interface IAppOptions<P extends JApp = JApp, Data = DefaultData<P>>
  extends App.AppInstance<Data> {}

export interface JApp extends Required<App.AppInstance>, INewEventBus {}

interface IJAppConstructor extends App.AppConstructor {
  mixin(obj: any): void;
  intercept(event: string, fn: IEventFunction): void;
}

export var JApp: IJAppConstructor;
