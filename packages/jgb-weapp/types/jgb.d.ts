/// <reference types="@tuhu/dt-weapp" />

import { IUsePlugin } from './plugins';
import { Router } from './router';
import { INewEventBus, IEventFunction, IEventBus } from './eventbus';
import { jgb } from './jgb-api';

export { Router };

export interface JPage extends IPage, INewEventBus {
  readonly $route: {
    path: string;
    params: any;
    query: any;
    hash: '';
    fullPath: string;
    name: string;
  };
  readonly $router: typeof Router;
}

export interface JApp extends IApp, INewEventBus {}

export interface JComponent extends IComponent, INewEventBus {}

interface IJPageConstructor extends IPageConstructor<JPage> {
  mixin(obj: any): void;
  intercept(event: string, fn: IEventFunction): void;
}

export var JPage: IJPageConstructor;

interface IJAppConstructor extends IAppConstructor<JApp> {
  mixin(obj: any): void;
  intercept(event: string, fn: IEventFunction): void;
}

export var JApp: IJAppConstructor;

interface IJComponentConstructor extends IComponentConstructor<JComponent> {
  mixin(obj: any): void;
  intercept(event: string, fn: IEventFunction): void;
}

export var JComponent: IJComponentConstructor;

export var bus: IEventBus;

export var use: IUsePlugin;

export { jgb };
