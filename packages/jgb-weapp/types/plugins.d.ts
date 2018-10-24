import { JApp, JPage, JComponent } from './jgb';
import { Router } from './router';
import { TypeJGBApi } from './jgb-api';

export type IUsePlugin = (res: IPlugin) => void;

export type InstallPlugin = (
  plugin: {
    JApp: typeof JApp;
    JPage: typeof JPage;
    JComponent: typeof JComponent;
    jgb: TypeJGBApi;
  }
) => void;

export interface IPlugin {
  install: InstallPlugin;
}
