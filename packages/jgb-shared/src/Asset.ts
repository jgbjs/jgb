import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as path from 'path';
import * as URL from 'url';
import { IInitOptions } from '../typings/jgb-shared';
import * as config from './config';
import { logger } from './Logger';
import Resolver from './Resolver';
import isUrl from './utils/isUrl';
import objectHash from './utils/objectHash';

export default class Asset {
  id: string;
  dependencies = new Map<string, any>();
  contents = '';
  basename: string;
  relativeName: string;
  resolver: Resolver;
  ast: any;
  processed = false;
  generated: any = null;
  hash: string;
  // tslint:disable-next-line:variable-name
  _package: any;

  startTime: any;
  endTime: any;
  cacheData: any;

  distPath: string;

  constructor(public name: string, public options: IInitOptions) {
    this.basename = path.basename(name);
    this.relativeName = path.relative(options.sourceDir, name);
    this.resolver = new Resolver(options);
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
  async resolveAliasName(name: string) {
    /** 引用文件是否在sourceDir */
    let isNotInSourceDir = false;
    let aliasKey = '';
    let distPath = '';
    const alias = this.options.alias;

    /**
     * resolve alias get relativepath
     * @example
     *  @/utils/index => ../utils/index
     */
    if (alias) {
      for (const key of Object.keys(alias)) {
        if (name.includes(key)) {
          aliasKey = key;
          name = path.normalize(name.replace(key, alias[key]));
          const sourceFile = this.name;
          const dependenceFile = name;
          // relative path: ..\\utils\\index => ../utils/index
          name = promoteRelativePath(path.relative(sourceFile, dependenceFile));

          isNotInSourceDir = path
            .relative(this.options.sourceDir, dependenceFile)
            .includes(`..${path.sep}`);

          break;
        }
      }
    }

    /** resolve relative path */
    const { path: absolutePath } = (await this.resolver.resolve(
      name,
      this.name
    )) as {
      path: string;
      pkg: any;
    };

    /** require相对引用路径 */
    let relativeRequirePath = '';

    /**
     * replace require dependenceFile's relativeRequirePath no in sourceDir
     * @example
     *  aliasKey: @somewhere
     *  require('@somewhere/abc') => require('npm/@somewhere/abc')
     */
    if (isNotInSourceDir) {
      aliasKey = pathToUnixType(aliasKey);
      const distNpmRelative = path.relative(alias[aliasKey], absolutePath);
      distPath = path.resolve(
        this.options.sourceDir,
        path.join('npm', aliasKey, distNpmRelative)
      );
      relativeRequirePath = promoteRelativePath(
        path.relative(this.name, distPath)
      );
    }

    /**
     * 引用npm包替换成npm目录引用
     * @example
     *  require('lodash') => require('npm/lodash/lodash.js')
     */
    if (absolutePath.includes('node_modules')) {
      relativeRequirePath = promoteRelativePath(
        path.relative(this.name, absolutePath)
      ).replace('../node_modules', 'npm');
    }

    if (distPath) {
      const distRelative = pathToUnixType(
        path.relative(this.options.sourceDir, distPath)
      );
      // in source dir
      if (!distRelative.includes('../')) {
        distPath = path.resolve(this.options.outDir, distRelative);
      }
    }

    return {
      /* 文件真实路径 */
      realName: name,
      distPath,
      /* require相对路径 */
      relativeRequirePath
    };
  }

  addDependency(name: string, opts: any = {}) {
    this.dependencies.set(name, Object.assign({ name }, opts));
  }

  addURLDependency(url: string, from = this.name, opts?: any) {
    if (!url || isUrl(url)) {
      return url;
    }

    if (typeof from === 'object') {
      opts = from;
      from = this.name;
    }

    const parsed = URL.parse(url);
    let depName;
    let resolved;
    let dir = path.dirname(from);
    const filename = decodeURIComponent(parsed.pathname);

    if (filename[0] === '~' || filename[0] === '/') {
      if (dir === '.') {
        dir = this.options.rootDir;
      }
      depName = resolved = this.resolver.resolveFilename(filename, dir);
    } else {
      resolved = path.resolve(dir, filename);
      depName = './' + path.relative(path.dirname(this.name), resolved);
    }

    this.addDependency(depName, Object.assign({ dynamic: true }, opts));

    // parsed.pathname = this.options.parser.getAsset(resolved, this.options);
    parsed.pathname = depName;

    return URL.format(parsed);
  }

  /**
   * 处理资源
   * 1. load
   * 2. pretransform
   * 3. getDependencies
   * 4. transform
   * 5. output
   */
  async process() {
    if (!this.id) {
      this.id = this.relativeName;
    }

    this.startTime = +new Date();

    await this.loadIfNeeded();
    await this.pretransform();
    await this.getDependencies();
    this.generated = await this.generate();
    const { code, ext } = this.generated;
    this.hash = await this.generateHash();
    const { distPath } = await this.output(code, ext);

    this.endTime = +new Date();

    logger.log(`${distPath}`, '编译', this.endTime - this.startTime);
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

  /**
   * 生成输出目录distPath
   * @param code
   * @param ext
   */
  async output(
    code: string,
    ext: string
  ): Promise<{
    distPath: string;
  }> {
    let prettyDistPath = this.distPath;

    if (this.distPath) {
      prettyDistPath = path.relative(this.options.outDir, this.distPath);
      await writeFile(this.distPath, code);
      return { distPath: prettyDistPath };
    }

    let distPath = path.resolve(this.options.outDir, this.relativeName);
    const isInNpm = distPath.includes('node_modules');
    if (isInNpm) {
      distPath = distPath.replace(
        'node_modules',
        path.join(path.basename(this.options.outDir), 'npm')
      );
    }
    const extName = path.extname(this.basename);
    if (!ext) {
      // index => index.js
      distPath += ext;
    } else if (extName !== ext) {
      // index.es6 => index.js
      distPath = distPath.replace(extName, ext);
    }

    this.distPath = distPath;

    await writeFile(distPath, code);

    prettyDistPath = path.relative(this.options.outDir, distPath);

    return {
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

  async generate(): Promise<{
    code: string;
    ext: string;
  }> {
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
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, code);
}

/**
 * 修正relatviePath
 * @param fPath
 */
function promoteRelativePath(fPath: string) {
  const fPathArr = fPath.split(path.sep);
  let dotCount = 0;
  fPathArr.forEach(item => {
    if (item.indexOf('..') >= 0) {
      dotCount++;
    }
  });
  if (dotCount === 1) {
    fPathArr.splice(0, 1, '.');
    return fPathArr.join('/');
  }
  if (dotCount > 1) {
    fPathArr.splice(0, 1);
    return fPathArr.join('/');
  }
  return pathToUnixType(fPath);
}

function pathToUnixType(fPath: string) {
  return fPath.replace(/\\/g, '/');
}
