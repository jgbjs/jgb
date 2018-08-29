import { EventEmitter } from 'events';
import * as fs from 'fs';
import { Asset, IInitOptions, Resolver } from 'jgb-shared/lib';
import Logger, { logger, LogType } from 'jgb-shared/lib/Logger';
import { normalizeAlias } from 'jgb-shared/lib/utils/index';
import WorkerFarm from 'jgb-shared/lib/workerfarm/WorkerFarm';
import * as Path from 'path';
import { promisify } from 'util';
import Compiler from './Compiler';
import FSCache from './FSCache';
import PromiseQueue from './utils/PromiseQueue';
import Watcher from './Watcher';

export default class Core extends EventEmitter {
  private currentDir = process.cwd();
  private loadedAssets = new Map<string, Asset>();
  private options: IInitOptions;
  private entryFiles: string[];

  buildQueue: PromiseQueue;
  resolver: Resolver;
  watcher: Watcher;
  compiler: Compiler;
  watchedAssets = new Map();
  farm: WorkerFarm;
  cache: FSCache;

  constructor(options: IInitOptions) {
    super();
    this.options = this.normalizeOptions(options);

    if (options.rootDir) {
      this.currentDir = options.rootDir;
    }

    this.entryFiles = this.normalizeEntryFiles();
    this.resolver = new Resolver(this.options);
    this.compiler = new Compiler(this.options);
    this.buildQueue = new PromiseQueue(this.processAsset.bind(this));

    if (this.options.cache) {
      this.cache = new FSCache(this.options);
    }
  }

  normalizeEntryFiles() {
    return []
      .concat(this.options.entryFiles || [])
      .filter(Boolean)
      .map(f => Path.resolve(this.options.sourceDir, f));
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
      alias: aliasResolve(options, rootDir)
    };
  }

  async start() {
    if (this.farm) {
      return;
    }

    const startTime = new Date();

    await this.compiler.init(this.resolver);
    // another channce to modify entryFiles
    this.entryFiles = this.normalizeEntryFiles();

    if (this.options.watch) {
      this.watcher = new Watcher();

      this.watcher.on('change', this.onChange.bind(this));
    }

    this.farm = WorkerFarm.getShared(this.options, {
      workerPath: require.resolve('./worker')
    });

    for (const entry of new Set(this.entryFiles)) {
      const asset = await this.resolveAsset(entry);

      this.buildQueue.add(asset);
    }

    await this.buildQueue.run();

    const endTime = new Date();

    logger.log(`编译耗时:${endTime.getTime() - startTime.getTime()}ms`);

    if (!this.options.watch) {
      process.exit(0);
    }
  }

  async processAsset(asset: Asset, isRebuild = false) {
    if (isRebuild) {
      asset.invalidate();
      if (this.cache) {
        this.cache.invalidate(asset.name);
      }
    }

    await this.loadAsset(asset);
  }

  async getAsset(name: string, parent: string) {
    const asset = await this.resolveAsset(name, parent);
    this.buildQueue.add(asset);
    await this.buildQueue.run();
    return asset;
  }

  async resolveAsset(name: string, parent?: string) {
    const { path } = await this.resolver.resolve(name, parent);

    return this.getLoadedAsset(path);
  }

  async loadAsset(asset: Asset) {
    if (asset.processed) {
      return;
    }

    // logger.info(asset.name);

    asset.processed = true;

    asset.startTime = Date.now();

    let processed: IPipelineProcessed =
      this.cache && (await this.cache.read(asset.name));
    let cacheMiss = false;

    if (!processed || asset.shouldInvalidate(processed.cacheData)) {
      processed = await this.farm.run(asset.name, asset.distPath);
      cacheMiss = true;
    }

    asset.endTime = Date.now();

    asset.id = processed.id;
    // asset.generated = processed.generated;
    asset.hash = processed.hash;

    const dependencies = processed.dependencies;
    

    const assetDeps = await Promise.all(
      dependencies.map(async dep => {
        // from cache dep
        if(Array.isArray(dep) && dep.length>1){
          dep = dep[1];
        }
        // This dependency is already included in the parent's generated output,
        // so no need to load it. We map the name back to the parent asset so
        // that changing it triggers a recompile of the parent.
        if (dep.includedInParent) {
          this.watch(dep.name, asset);
          return;
        }

        dep.parent = asset.name;
        const assetDep = await this.resolveDep(asset, dep);
        if (assetDep) {
          if (dep.distPath) {
            assetDep.distPath = dep.distPath;
          }

          await this.loadAsset(assetDep);

          dep.asset = assetDep;
          dep.resolved = assetDep.name;
        } else {
          logger.warning(`can not resolveDep: ${dep.name}`);
        }

        return assetDep;
      })
    );

    if (this.cache && cacheMiss) {
      await this.cache.write(asset.name, processed);
    }
  }

  async resolveDep(asset: Asset, dep: any, install = true) {
    try {
      if (Array.isArray(dep) && dep.length === 2) {
        dep = dep[1];
      }

      if (dep.resolved) {
        return this.getLoadedAsset(dep.resolved);
      }

      return await this.resolveAsset(dep.name, asset.name);
    } catch (err) {
      // If the dep is optional, return before we throw
      if (dep.optional) {
        return;
      }

      throw err;
    }
  }

  getLoadedAsset(path: string) {
    if (this.loadedAssets.has(path)) {
      return this.loadedAssets.get(path);
    }

    const asset = this.compiler.getAsset(path);
    this.loadedAssets.set(path, asset);

    this.watch(path, asset);
    return asset;
  }

  async watch(path: string, asset: Asset) {
    if (!this.watcher) {
      return;
    }

    path = await promisify(fs.realpath)(path);

    if (!this.watchedAssets.has(path)) {
      this.watcher.watch(path);
      this.watchedAssets.set(path, new Set());
    }
    this.watchedAssets.get(path).add(asset);
  }

  async unwatch(path: string, asset: Asset) {
    path = await promisify(fs.realpath)(path);
    if (!this.watchedAssets.has(path)) {
      return;
    }

    const watched = this.watchedAssets.get(path);
    watched.delete(asset);

    if (watched.size === 0) {
      this.watchedAssets.delete(path);
      this.watcher.unwatch(path);
    }
  }

  async onChange(path: string) {
    const assets: Asset[] = this.watchedAssets.get(path);
    if (!assets) {
      return;
    }

    // Add the asset to the rebuild queue, and reset the timeout.
    for (const asset of assets) {
      this.buildQueue.add(asset, true);
    }

    await this.buildQueue.run();
  }
}

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
        aliasValue.path = Path.resolve(root, aliasPath);
      }

      newAlias[key] = aliasValue;
    });
  return newAlias;
}
