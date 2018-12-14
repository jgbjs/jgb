/// <reference types="miniprogram-api-typings" />

import { IEventBus, IEventFunction, INewEventBus } from "./eventbus";
import { JApp } from "./JApp";
import { JComponent } from "./JComponent";
import { jgb } from "./jgb-api";
import { JPage } from "./JPage";
import { IUsePlugin } from "./plugins";
import { Router } from "./router";

export { Router, JPage, JComponent, JApp };

export var bus: IEventBus;

export var use: IUsePlugin;

export { jgb };
