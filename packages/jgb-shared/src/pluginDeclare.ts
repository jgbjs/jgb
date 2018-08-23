import { EventEmitter } from 'events';
import Asset from './Asset';
export type TypeAsset = typeof Asset;

export interface ICompiler extends EventEmitter {
  addAssetsType(exts: string | string[], asset: TypeAsset): void;
}

export type IPluginRegister = (compiler: ICompiler, config: any) => any;

export default function declare(
  pluginRegister: IPluginRegister
): IPluginRegister {
  return (compiler: ICompiler, config: any) => {
    return pluginRegister(compiler, config);
  };
}
