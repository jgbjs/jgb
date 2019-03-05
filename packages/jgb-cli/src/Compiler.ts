import { Asset, IInitOptions, IPluginConfig, localRequire, Resolver } from '@jgbjs/shared/lib';
import AwaitEventEmitter from '@jgbjs/shared/lib/awaitEventEmitter';
import { ICompiler, IPluginRegister } from '@jgbjs/shared/lib/pluginDeclare';
import StaticAsset from '@jgbjs/shared/lib/StaticAsset';
import * as path from 'path';
import standardizeName from './utils/standardizeName';

type TypeAsset = typeof Asset;

export default class Compiler extends AwaitEventEmitter implements ICompiler {
  private extensions = new Map<string, TypeAsset>();
  resolver: Resolver;

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
    this.resolver = resolver;
    const exts = [...this.extensions.keys()];
    this.options.extensions = new Set(exts);
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
      pluginName = standardizeName('plugin', pluginName);

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
      presetName = standardizeName('preset', presetName);

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

  /**
   * addAssetsType 时会自动添加parentCompiler
   * @param exts
   * @param asset
   */
  addAssetsType(exts: string | string[], asset: string | TypeAsset) {
    [].concat(exts).forEach(ext => {
      if (typeof asset === 'string') {
        const assetTemp = require(asset);
        asset = (assetTemp.default || assetTemp) as TypeAsset;
      }
      asset.prototype.parentCompiler = this;
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
