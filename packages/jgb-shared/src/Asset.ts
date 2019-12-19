import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';
import * as URL from 'url';
import { IInitOptions } from '../typings/jgb-shared';
import * as config from './config';
import { logger } from './Logger';
import { ICompiler } from './pluginDeclare';
import Resolver from './Resolver';
import SourceMap from './SourceMap';
import { normalizeAlias, pathToUnixType, promoteRelativePath } from './utils';
import isUrl from './utils/isUrl';
import { matchAlias } from './utils/matchAlias';
import objectHash from './utils/objectHash';
import WorkerFarm from './workerfarm/WorkerFarm';

const DEFAULT_NPM_DIR = 'npm';
const REG_NODE_MODULES = /(\/node_modules\/|\/npm\/)/g;

const NODE_MODULES = 'node_modules';

/** Asset 缓存数据  */
export const cache = new Map();

export interface IAssetGenerate {
  code: string;
  ext: string;
  map?: SourceMap;
}

export interface IDepOptions {
  [key: string]: any;
  name?: string;
  distPath?: string;
}

export default class Asset {
  id: string;
  dependencies = new Map<string, IDepOptions>();
  contents = '';
  basename: string;
  relativeName: string;
  resolver: Resolver;
  ast: any;
  processed = false;
  generated: IAssetGenerate | IAssetGenerate[] = null;
  hash: string;
  // tslint:disable-next-line:variable-name
  _package: any;

  startTime: any;
  endTime: any;
  cacheData: any = {};

  distPath: string;
  /** 在addAssetsType会自动注入compiler */
  parentCompiler: ICompiler;

  private checkOptions(options: IInitOptions) {
    if (!options.sourceDir) {
      throw new Error('please set options.sourceDir');
    }

    if (!options.outDir) {
      throw new Error('please set options.outDir');
    }
  }

  constructor(public name: string, public options: IInitOptions) {
    this.checkOptions(options);
    this.basename = path.basename(name);
    this.relativeName = path.relative(options.sourceDir, name);
    const resolver = WorkerFarm.getSharedResolver();
    this.resolver = resolver || new Resolver(options);
  }

  /**
   * 获取cli的Compiler
   */
  get compiler() {
    if (this.parentCompiler) {
      return this.parentCompiler;
    }
  }

  invalidate() {
    this.processed = false;
    this.contents = null;
    this.ast = null;
    this.generated = null;
    this.hash = null;
    this.dependencies.clear();
    // this.depAssets.clear();
  }

  /**
   * 判断是否需要 invalidate 资源
   */
  shouldInvalidate(cacheData?: any) {
    return false;
  }

  /**
   * 解析引用资源aliasName
   * 根据当前文件
   * @param name
   */
  async resolveAliasName(name: string, ext: string = '') {
    /** resolve relative path */
    let { path: absolutePath } = (await this.resolver.resolve(
      name,
      this.name
    )) as {
      path: string;
      pkg: any;
    };
    if (!this.resolver.isSameTarget) {
      absolutePath = await this.resolver.resolvePlatformModule(absolutePath);
    }
    /** require相对引用路径 */
    let relativeRequirePath = '';

    const distPath = this.generateDistPath(absolutePath, ext);
    const parentDistPath = this.generateDistPath(this.name, ext);
    if (distPath && parentDistPath) {
      if (distPath === parentDistPath) {
        relativeRequirePath = `./${path.basename(distPath)}`;
      } else {
        relativeRequirePath = promoteRelativePath(
          path.relative(parentDistPath, distPath)
        );
      }
    }

    absolutePath = pathToUnixType(absolutePath);

    return {
      /* 文件真实路径 */
      realName: absolutePath,
      distPath,
      absolutePath,
      /* require相对路径 */
      relativeRequirePath
    };
  }

  addDependency(name: string, opts?: IDepOptions) {
    if (!name.endsWith('.d.ts')) {
      this.dependencies.set(name, Object.assign({ name }, opts));
    }
  }

  async addURLDependency(url: string, from = this.name, opts?: any) {
    if (!url || isUrl(url)) {
      return url;
    }

    if (typeof from === 'object') {
      opts = from;
      from = this.name;
    }

    const parsed = URL.parse(url);
    const filename = decodeURIComponent(parsed.pathname);
    const ext = path.extname(filename);
    const parser = this.options.parser.findParser(filename);

    const {
      realName,
      relativeRequirePath,
      distPath
    } = await this.resolveAliasName(filename, parser ? parser.outExt : ext);
    this.addDependency(
      realName,
      Object.assign({ dynamic: true, distPath }, opts)
    );

    // parsed.pathname = this.options.parser.getAsset(resolved, this.options);

    parsed.pathname = relativeRequirePath;

    return URL.format(parsed);
  }

  /**
   * 处理资源
   * 1. load
   * 2. pretransform
   * 3. getDependencies
   * 4. transform
   * 5. generate
   * 6. output
   */
  async process() {
    if (!this.id) {
      this.id = this.relativeName;
    }

    const startTime = +new Date();

    await this.loadIfNeeded();
    await this.pretransform();
    await this.getDependencies();
    await this.transform();
    this.generated = await this.generate();
    const generated: IAssetGenerate[] = [].concat(this.generated);
    for (const { code, ext, map } of generated) {
      this.hash = await this.generateHash();
      const { distPath, ignore } = await this.output(code, ext, map);
      const endTime = +new Date();

      if (!ignore) {
        logger.log(`${distPath}`, '编译', endTime - startTime);
      }
    }
  }

  async loadIfNeeded() {
    if (!this.contents) {
      this.contents = (await this.load()) || '';
    }
  }

  // tslint:disable-next-line:no-empty
  async pretransform() {}

  // tslint:disable-next-line:no-empty
  async transform() {}

  // tslint:disable-next-line:no-empty
  async postProcess(generated: any): Promise<any> {}

  /**
   * 获取当前资源的依赖资源
   */
  async getDependencies() {
    await this.loadIfNeeded();

    if (this.contents && this.mightHaveDependencies()) {
      await this.parseIfNeeded();
      await this.collectDependencies();
    }
  }

  async parseIfNeeded() {
    await this.loadIfNeeded();
    if (!this.ast) {
      this.ast = await this.parse(this.contents);
    }
  }

  async collectDependencies() {
    console.log('Asset.collectDependencies must be overload');
  }

  mightHaveDependencies() {
    return true;
  }

  get isSameTarget() {
    return this.options.target === this.options.source;
  }

  /**
   * 生成文件dist路径
   */
  generateDistPath(sourcePath: string, ext: string = '') {
    const cacheKey = `${sourcePath}-${ext}`;
    if (cache.has(cacheKey)) {
      return cache.get(cacheKey);
    }

    const alias = this.options.alias;
    const sourceDir = pathToUnixType(path.resolve(this.options.sourceDir));
    const name = pathToUnixType(sourcePath);
    let distPath = '';

    const aliasDirs = [...Object.entries(alias)];

    while (aliasDirs.length) {
      const [aliasName, aliasValue] = aliasDirs.shift();
      const [normalizedAlias] = normalizeAlias(aliasValue);
      const dir = pathToUnixType(normalizedAlias.path);
      const distDir = normalizedAlias?.dist ?? DEFAULT_NPM_DIR;
      // in alias source dir but not in build source file
      if (name.includes(sourceDir)) {
        const relatePath = path.relative(sourceDir, name);
        distPath = path.join(this.options.outDir, relatePath);
        break;
      }

      if (matchAlias(dir, name)) {
        // 相对于alias目录的相对路径
        const relativeAlias = path.relative(dir, name);

        distPath = path.join(
          this.options.outDir,
          distDir,
          aliasName as string,
          relativeAlias
        );
        break;
      }
    }
    /**
     * node_modules/npm => npm
     */
    if (
      (!distPath && name.includes(NODE_MODULES)) ||
      distPath.includes(NODE_MODULES)
    ) {
      const spNM = name.split(NODE_MODULES);
      const relativeAlias = spNM.pop();
      distPath = path.join(this.options.outDir, DEFAULT_NPM_DIR, relativeAlias);
    }

    if (!distPath) {
      const relatePath = path.relative(sourceDir, name);
      distPath = path.join(this.options.outDir, relatePath);
    }

    const extName = path.extname(distPath);

    if (!extName) {
      // index => index.js
      distPath += ext;
    } else if (ext && extName && extName !== ext) {
      if (this.options.extensions.has(extName)) {
        // index.es6 => index.js
        distPath = distPath.replace(extName, ext);
      }
    }
    // fix style
    distPath = pathToUnixType(distPath);
    // index.target.js => index.js
    if (!this.isSameTarget && distPath.includes(`.${this.options.target}.`)) {
      distPath = distPath.replace(
        new RegExp(`\\.${this.options.target}\\.`),
        '.'
      );
    }

    cache.set(cacheKey, distPath);

    return distPath;
  }

  /**
   * 生成输出目录distPath
   * @param code
   * @param ext
   */
  async output(
    code: string,
    ext: string = '',
    map: SourceMap
  ): Promise<{
    distPath: string;
    ignore: boolean;
  }> {
    /* 是否忽略编译 */
    let ignore = true;

    let distPath =
      this.generateDistPath(this.name, ext) ||
      path.resolve(this.options.outDir, this.relativeName);

    let prettyDistPath = distPath;
    const extName = path.extname(this.basename);

    if (!ext && !path.extname(distPath)) {
      // index => index.js
      distPath += ext;
    } else if (extName !== ext) {
      // index.es6 => index.js
      distPath = distPath.replace(extName, ext);
    }

    this.distPath = distPath;

    prettyDistPath = promoteRelativePath(
      path.relative(this.options.outDir, distPath)
    );

    // if distPath not in outDir
    if (!prettyDistPath.startsWith('..')) {
      ignore = false;
      const sourceMapString = map
        ? map.stringify(path.basename(prettyDistPath), '/')
        : '';

      await fs.ensureDir(path.dirname(distPath));

      if (!this.options.minify && sourceMapString) {
        if (this.options.inlineSourceMap) {
          // inline base64
          writeFile(
            distPath,
            code +
              `\r\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${Buffer.from(
                sourceMapString,
                'utf-8'
              ).toString('base64')}`
          );
        } else {
          // sourcemap file
          const distMap = `${path.dirname(this.distPath)}/${path.basename(
            this.distPath
          )}.map`;
          writeFile(distMap, sourceMapString);
          writeFile(
            distPath,
            code +
              `\r\n//# sourceMappingURL=./${path.basename(this.distPath)}.map`
          );
        }
      } else {
        writeFile(distPath, code);
      }
    }

    return {
      ignore,
      distPath: prettyDistPath
    };
  }

  async generateHash() {
    return objectHash(this.generated);
  }

  /**
   * 加载资源
   */
  async load() {
    return await fs.readFile(this.name, 'utf-8');
  }

  /**
   * 解析资源
   * @param contents
   */
  async parse(contents: string): Promise<any> {
    console.log('Asset.parse must be overload');
  }

  async generate(): Promise<IAssetGenerate | IAssetGenerate[]> {
    // console.log('Asset.generate must be overload');
    return {
      code: '',
      ext: ''
    };
  }

  async getPackage() {
    if (!this._package) {
      this._package = await this.resolver.findPackage(path.dirname(this.name));
    }

    return this._package;
  }

  async getConfig(filenames: string[], opts: any = {}) {
    if (opts.packageKey) {
      const pkg = await this.getPackage();
      if (pkg && pkg[opts.packageKey]) {
        return _.cloneDeep(pkg[opts.packageKey]);
      }
    }

    // Resolve the config file
    const conf = await config.resolve(opts.path || this.name, filenames);
    if (conf) {
      // Add as a dependency so it is added to the watcher and invalidates
      // this asset when the config changes.
      await this.addDependency(conf, { includedInParent: true });
      if (opts.load === false) {
        return conf;
      }

      return await config.load(opts.path || this.name, filenames);
    }

    return null;
  }
}

async function writeFile(filePath: string, code: string) {
  fs.writeFile(filePath, code);
}
