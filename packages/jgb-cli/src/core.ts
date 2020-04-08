import * as Debug from 'debug';
import * as fg from 'fast-glob';
import * as fs from 'fs-extra';
import { Asset, IInitOptions, Resolver } from 'jgb-shared/lib';
import { IAssetGenerate } from 'jgb-shared/lib/Asset';
import AwaitEventEmitter from 'jgb-shared/lib/awaitEventEmitter';
import { logger } from 'jgb-shared/lib/Logger';
import { normalizeAlias, pathToUnixType } from 'jgb-shared/lib/utils/index';
import WorkerFarm from 'jgb-shared/lib/workerfarm/WorkerFarm';
import * as Path from 'path';
import { promisify } from 'util';
import Compiler from './Compiler';
import FSCache from './FSCache';
import { IPipelineProcessed } from './Pipeline';
import PromiseQueue from './utils/PromiseQueue';
import Watcher from './Watcher';

const debug = Debug('core');

export default class Core extends AwaitEventEmitter {
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
  hooks: Array<(...args: any[]) => Promise<void>>;

  constructor(options: IInitOptions) {
    super();
    this.hooks = options.hooks || [];
    this.options = this.normalizeOptions(options);
    this.injectEnv();

    if (options.rootDir) {
      this.currentDir = options.rootDir;
    }

    this.entryFiles = this.normalizeEntryFiles();

    this.compiler = new Compiler(this.options);
    this.buildQueue = new PromiseQueue(this.processAsset.bind(this));

    if (this.options.cache) {
      this.cache = new FSCache(this.options);
    }
    logger.setOptions(this.options);
  }

  normalizeEntryFiles(): string[] {
    const entryFiles = this.options.entryFiles;
    const files = []
      .concat(!entryFiles || entryFiles.length === 0 ? 'app.*' : entryFiles)
      .filter(Boolean)
      .map((f) => Path.resolve(this.options.sourceDir, f));

    return fg.sync(files, { onlyFiles: true, unique: true });
  }

  /**
   * 注入所需的环境变量
   */
  injectEnv() {
    process.env.JGB_ENV = this.options.target;
    process.env.JGB_LOG_LEVEL = `${this.options.logLevel}`;
    process.env.JGB_VERSION = this.options.cliVersion;
  }

  normalizeOptions(options: IInitOptions): IInitOptions {
    const rootDir = Path.resolve(options.rootDir || this.currentDir);
    return {
      plugins: options.plugins,
      presets: options.presets,
      watch: !!options.watch,
      rootDir,
      logLevel: isNaN(options.logLevel) ? 3 : options.logLevel,
      useLocalWorker: !!options.useLocalWorker,
      outDir: Path.resolve(options.outDir || 'dist'),
      npmDir: Path.resolve(options.npmDir || 'node_modules'),
      entryFiles: options.entryFiles,
      cache: !!options.cache,
      sourceDir: Path.resolve(options.sourceDir || 'src'),
      alias: aliasResolve(options, rootDir),
      minify: !!options.minify,
      source: options.source || 'wx',
      target: options.target || 'wx',
      lib: options.lib,
      inlineSourceMap: !!options.inlineSourceMap,
      resolve: options.resolve,
      cliVersion: options.cliVersion,
    };
  }

  async initHook() {
    if (!this.hooks || this.hooks.length === 0) {
      return;
    }

    const allHooks = this.hooks.map(async (fn) => await fn(this));

    await Promise.all(allHooks);
  }

  async init() {
    await this.compiler.init(this.resolver);
    this.resolver = new Resolver(this.options);
    this.compiler.resolver = this.resolver;
  }

  async start() {
    const startTime = new Date();

    if (this.farm) {
      return;
    }

    logger.progress(`编译中...`);

    try {
      await this.initHook();

      await this.emit('before-init');

      await this.init();

      await this.emit('before-compiler');

      // another channce to modify entryFiles
      this.entryFiles = this.normalizeEntryFiles();
      if (this.options.watch) {
        this.watcher = new Watcher();

        this.watcher.on('change', this.onChange.bind(this));
      }

      this.farm = WorkerFarm.getShared(this.options, {
        workerPath: require.resolve('./worker'),
        core: this,
      });

      for (const entry of new Set(this.entryFiles)) {
        const asset = await this.resolveAsset(entry);
        this.buildQueue.add(asset);
      }

      await this.buildQueue.run();
    } catch (error) {
      if (error.fileName) {
        logger.error(`file: ${error.fileName}`);
      }
      logger.error(error.stack);
      if (!this.options.watch) {
        await this.stop();
        process.exit(1);
      }
    } finally {
      const endTime = new Date();

      await this.emit('end-build');

      console.log(`编译耗时:${endTime.getTime() - startTime.getTime()}ms`);
      if (!this.options.watch) {
        await this.stop();
      }
    }
  }

  async scan() {
    if (this.farm) {
      return;
    }

    await this.initHook();

    await this.emit('before-init');

    await this.init();

    await this.emit('before-compiler');

    // another channce to modify entryFiles
    this.entryFiles = this.normalizeEntryFiles();

    if (this.options.watch) {
      this.watcher = new Watcher();

      this.watcher.on('change', this.onChange.bind(this));
    }

    this.farm = WorkerFarm.getShared(this.options, {
      workerPath: require.resolve('./worker'),
      core: this,
    });
    const jsonAsset = this.entryFiles.find((item) =>
      new RegExp(/\.json$/).test(item)
    );
    let asset = null;
    for (const entry of new Set([jsonAsset])) {
      asset = await this.resolveAsset(entry);
    }

    await this.loadAsset(asset);
    await this.stop();
    // for (const entry of new Set(this.entryFiles)) {
    //   const asset = await this.resolveAsset(entry);
    //   this.buildQueue.add(asset);
    // }
    //
    // await this.buildQueue.run();
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

  async loadAsset(asset: Asset, cacheMiss = false) {
    if (asset.processed) {
      return;
    }

    // logger.info(asset.name);

    asset.processed = true;

    asset.startTime = Date.now();

    let processed: IPipelineProcessed =
      this.cache && (await this.cache.read(asset.name));
    if (
      cacheMiss ||
      !processed ||
      asset.shouldInvalidate(processed.cacheData)
    ) {
      processed = await this.farm.run(asset.name, asset.distPath);
      cacheMiss = true;
    }

    asset.endTime = Date.now();

    // 耗時
    const usedTime = asset.endTime - asset.startTime;

    debug(`${asset.name} processd time: ${usedTime}ms`);

    asset.id = processed.id;
    asset.generated = processed.generated;
    asset.hash = processed.hash;
    const dependencies = processed.dependencies;

    try {
      for (let dep of dependencies) {
        // from cache dep
        if (Array.isArray(dep) && dep.length > 1) {
          dep = dep[1];
        }
        // This dependency is already included in the parent's generated output,
        // so no need to load it. We map the name back to the parent asset so
        // that changing it triggers a recompile of the parent.
        if (dep.includedInParent) {
          this.watch(dep.name, asset);
          continue;
        }

        dep.parent = asset.name;
        const assetDep = await this.resolveDep(asset, dep);
        if (assetDep && fs.existsSync(assetDep.name)) {
          if (dep.distPath) {
            assetDep.distPath = dep.distPath;
          }

          this.buildQueue.add(assetDep);

          dep.parent = asset.name;
          dep.resolved = assetDep.name;
        } else {
          throw new Error(`Cannot found ${assetDep.name} from ${asset.name}`);
        }
      }
    } catch (error) {
      if (cacheMiss) {
        throw error;
      }
      // 缓存中的依赖可能失效，需要重新加载
      asset.processed = false;
      await this.loadAsset(asset, true);
      return;
    }

    const generated: IAssetGenerate[] = [].concat(asset.generated);
    for (const { code, ext, map } of generated) {
      const { distPath, ignore } = await asset.output(
        code,
        ext,
        map,
        !cacheMiss
      );
      if (!ignore) {
        logger.log(`${distPath}`, '编译', usedTime);
      }
    }

    if (this.cache && cacheMiss) {
      this.cache.write(asset.name, processed);
    }
  }

  async resolveDep(asset: Asset, dep: any) {
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
    if (this.loadedAssets.has(asset.name)) {
      return this.loadedAssets.get(asset.name);
    }

    this.loadedAssets.set(path, asset);

    this.watch(path, asset);
    return asset;
  }

  async watch(path: string, asset: Asset) {
    if (!this.watcher) {
      return;
    }

    path = await fs.realpath(path);

    if (!this.watchedAssets.has(path)) {
      this.watcher.watch(path);
      this.watchedAssets.set(path, new Set());
    }
    this.watchedAssets.get(path).add(asset);
  }

  async stop() {
    if (this.watcher) {
      this.watcher.stop();
    }

    if (this.farm) {
      this.farm.end();
    }
    logger.stopSpinner();
    // fix sometimes won't stop
    setTimeout(() => process.exit(), 1000);
  }

  async unwatch(path: string, asset: Asset) {
    path = await fs.realpath(path);
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

export function aliasResolve(
  options: IInitOptions,
  root: string
): IInitOptions['alias'] {
  const alias = options.alias || {};
  const newAlias: { [key: string]: any } = {};

  Object.keys(alias).forEach((key) => {
    const aliasValues = normalizeAlias(alias[key]);

    newAlias[key] = aliasValues.map((aliasValue) => {
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
      return aliasValue;
    });
  });
  return newAlias;
}
