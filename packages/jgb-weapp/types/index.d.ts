/// <reference types="@tuhu/dt-weapp" />

import EventBus, { IEventFunction } from '../src/EventBus';

export = JGB;

export as namespace JGB;

declare namespace JGB {
  interface JPage extends IPage, EventBus {}

  interface JApp extends IApp, EventBus {}

  interface JComponent extends IComponent, EventBus {}

  interface IJPageConstructor extends IPageConstructor<JPage> {
    mixin(obj: any): void;
    intercept(event: string, fn: IEventFunction): void;
  }

  var JPage: IJPageConstructor;

  interface IJAppConstructor extends IAppConstructor<JApp> {
    mixin(obj: any): void;
    intercept(event: string, fn: IEventFunction): void;
  }

  var JApp: IJAppConstructor;

  interface IJComponentConstructor extends IComponentConstructor<JComponent> {
    mixin(obj: any): void;
    intercept(event: string, fn: IEventFunction): void;
  }

  var JComponent: IJComponentConstructor;
}
