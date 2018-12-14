import { JApp, JComponent, JPage } from "./jgb";
import { jgb } from "./jgb-api";
import { Router } from "./router";

export type IUsePlugin = (res: IPlugin) => void;

export type InstallPlugin = (
  plugin: {
    JApp: typeof JApp;
    JPage: typeof JPage;
    JComponent: typeof JComponent;
    jgb: typeof jgb;
  }
) => void;

export interface IPlugin {
  install: InstallPlugin;
}
