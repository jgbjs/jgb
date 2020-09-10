import chalk, { Chalk } from 'chalk';
import Asset from './Asset';
import AwaitEventEmitter from './awaitEventEmitter';
import { logger } from './Logger';
export type TypeAsset = typeof Asset;

/**
 * cli的Compiler实例
 */
export interface ICompiler extends AwaitEventEmitter {
  addAssetsType(exts: string | string[], asset: TypeAsset): void;
  addResolveGlob(globs: string | string[], asset: string | TypeAsset): void;
}

/** 返回pluginName  */
export type IPluginRegister = (
  compiler: ICompiler,
  config: any
) => string | void;

const loadedPlugins = new Set();

export default function declare(pluginRegister: IPluginRegister): any {
  return (compiler: ICompiler, config: any) => {
    const pluginName = pluginRegister(compiler, config);
    if (!pluginName || loadedPlugins.has(pluginName)) {
      return;
    }
    loadedPlugins.add(pluginName);
    logger.log(chalk.gray(`[加载]: ${pluginName}`));
  };
}
