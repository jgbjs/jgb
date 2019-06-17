import * as Path from 'path'
import chalk from 'chalk';
import * as fs from 'fs'
import * as babel from 'babel-core';
import * as path from 'path'
import { getJGBConfig } from '../config';
import AwaitEventEmitter from "jgb-shared/lib/awaitEventEmitter";
import {Asset, IInitOptions, Resolver} from "jgb-shared/lib";
import {normalizeAlias, pathToUnixType} from "jgb-shared/lib/utils/index";
import Compiler from "../Compiler";
import Core1 from '../core'

function aliasResolve(options: IInitOptions, root: string) {
  const alias = options.alias || {};
  const newAlias: { [key: string]: any } = {};
  /**
   * 先排序 字符长度由长到短排序 （优先匹配）
   * 再补充 resolve(aliasValue)
   */
  Object.keys(alias)
    .sort((a1, a2) => a2.length - a1.length)
    .forEach(key => {
      const aliasValue = normalizeAlias(alias[key]);
      const aliasPath = aliasValue.path;
      if (!Path.isAbsolute(aliasPath)) {
        if (aliasPath.startsWith('.')) {
          aliasValue.path = pathToUnixType(Path.resolve(root, aliasPath));
        } else {
          aliasValue.path = pathToUnixType(
            Path.resolve(root, 'node_modules', aliasPath)
          );
        }
      }

      newAlias[key] = aliasValue;
    });
  return newAlias;
}


class Core extends AwaitEventEmitter{
  private currentDir = process.cwd();
  private loadedAssets = new Map<string, Asset>();
  private options: IInitOptions;
  private entryFiles: string[];

  resolver: Resolver;
  compiler: Compiler;
  constructor(options: IInitOptions) {
    super()
    this.options = this.normalizeOptions(options);
    this.resolver = new Resolver(this.options);
    this.compiler = new Compiler(this.options);
  }


  normalizeOptions(options: IInitOptions): IInitOptions {
    const rootDir = Path.resolve(options.rootDir || this.currentDir);
    return {
      plugins: options.plugins,
      presets: options.presets,
      watch: !!options.watch,
      rootDir,
      useLocalWorker: !!options.useLocalWorker,
      outDir: Path.resolve(options.outDir || 'dist'),
      npmDir: Path.resolve(options.npmDir || 'node_modules'),
      entryFiles: [].concat(options.entryFiles),
      cache: !!options.cache,
      sourceDir: Path.resolve(options.sourceDir || 'src'),
      alias: aliasResolve(options, rootDir),
      minify: !!options.minify,
      source: options.source || 'wx',
      target: options.target || 'wx',
      lib: options.lib
    };
  }

  normalizeEntryFiles() {
    return []
      .concat(this.options.entryFiles || [])
      .filter(Boolean)
      .map(f => Path.resolve(this.options.sourceDir, f));
  }

  async scan() {
    await this.init()
    this.entryFiles = this.normalizeEntryFiles();
    const jsonAsset = this.entryFiles.find(item => new RegExp( /\.json$/).test(item))
    const assets: any[] = []
    for (const entry of new Set([jsonAsset])) {
      const asset = await this.resolveAsset(entry);
      assets.push(asset)
    }
    console.log(assets)
  }

  async init() {
    await this.compiler.init(this.resolver);
  }

  async resolveAsset(name: string, parent?: string) {
    const { path } = await this.resolver.resolve(name, parent);

    return this.getLoadedAsset(path);
  }

  getLoadedAsset(path: string) {
    if (this.loadedAssets.has(path)) {
      return this.loadedAssets.get(path);
    }

    const asset = this.compiler.getAsset(path);
    if (this.loadedAssets.has(asset.name)) {
      return this.loadedAssets.get(asset.name);
    }

    this.loadedAssets.set(path, asset);
    this.loadedAssets.set(asset.name, asset);

    // this.watch(path, asset);
    return asset;
  }
}

export default async function scan(
  program: any
) {
  const config = await getJGBConfig();
  const core = new Core1(
    Object.assign(
      {
        cache: true
      },
      config
    )
  );

  await core.scan()
}