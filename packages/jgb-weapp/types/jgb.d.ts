/// <reference types="@tuhu/miniprogram-api-typings" />

import { IEventBus } from './eventbus';
import { JApp } from './JApp';
import { JComponent } from './JComponent';
import { jgb } from './jgb-api';
import { JPage } from './JPage';
import { IUsePlugin } from './plugins';
import { Router } from './router';

export { Router, JPage, JComponent, JApp };
export { jgb };

export var bus: IEventBus;

export var use: IUsePlugin;

export const Compute: (opts: any) => (scope: any) => void;
