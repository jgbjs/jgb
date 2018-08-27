import {
  Asset,
  IInitOptions,
  IPluginConfig,
  localRequire,
  Resolver
} from 'jgb-shared/lib';
import AwaitEventEmitter from 'jgb-shared/lib/awaitEventEmitter';
import { ICompiler, IPluginRegister } from 'jgb-shared/lib/pluginDeclare';
import StaticAsset from 'jgb-shared/lib/StaticAsset';
import * as path from 'path';

type TypeAsset = typeof Asset;

export default class Compiler extends AwaitEventEmitter implements ICompiler {
  private extensions = new Map<string, TypeAsset>();

  constructor(private options: IInitOptions) {
    super();
  }

  /**
   * 预加载插件等信息
   */
  async preload(options: IInitOptions) {
    await this.loadPresets(options.presets);
    await this.loadPlugins(options.plugins);
  }

  async init(resolver: Resolver) {
    await this.preload(this.options);

    const exts = [...this.extensions.keys()];
    resolver.addExts(exts);
  }

  /**
   * 加载插件
   * @param plugins
   */
  async loadPlugins(plugins: IPluginConfig[] = []) {
    const relative = path.join(this.options.rootDir);
    for (const plugin of new Set(plugins)) {
      // tslint:disable-next-line:prefer-const
      let [pluginName, pluginConfig] = [].concat(plugin);
      if (!(pluginName as string).startsWith('jgb-plugin-')) {
        pluginName = `jgb-plugin-${pluginName}`;
      }

      if (!pluginConfig) {
        pluginConfig = {};
      }

      const loadedPlugin = await localRequire(pluginName, relative);
      const invoke: IPluginRegister = loadedPlugin.default || loadedPlugin;
      await invoke(this, pluginConfig);
    }
  }

  /**
   * 加载预设配置
   * @param presets
   */
  async loadPresets(presets: IPluginConfig[]) {
    const relative = path.join(this.options.rootDir);
    for (const preset of new Set(presets)) {
      // tslint:disable-next-line:prefer-const
      let [presetName, presetConfig] = [].concat(preset);
      if (!(presetName as string).startsWith('jgb-preset-')) {
        presetName = `jgb-preset-${presetName}`;
      }

      if (!presetConfig) {
        presetConfig = {};
      }

      const loadedPlugin = await localRequire(presetName, relative);
      const invoke: IPluginRegister = loadedPlugin.default || loadedPlugin;
      await invoke(
        this,
        Object.assign(presetConfig, {
          coreOptions: this.options
        })
      );
    }
  }

  addAssetsType(exts: string | string[], asset: string | TypeAsset) {
    [].concat(exts).forEach(ext => {
      if (typeof asset === 'string') {
        const assetTemp = require(asset);
        asset = (assetTemp.default || assetTemp) as TypeAsset;
      }
      this.extensions.set(ext.toLowerCase(), asset);
    });
  }

  findParser(fileName: string, fromPipeline: boolean = false): TypeAsset {
    const extension = path.extname(fileName).toLowerCase();
    return this.extensions.get(extension);
  }

  getAsset(fileName: string): Asset {
    const Parser = this.findParser(fileName);
    this.options.parser = this;
    if (typeof Parser === 'undefined') {
      return new StaticAsset(fileName, this.options);
    } else {
      return new Parser(fileName, this.options);
    }
  }
}
