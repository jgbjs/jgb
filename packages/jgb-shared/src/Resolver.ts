import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as path from 'path';
import { promisify } from 'util';
import { IAliasValue, IInitOptions } from '../typings/jgb-shared';
import { normalizeAlias, pathToUnixType } from './utils';
import { matchAlias } from './utils/matchAlias';

// debug.enable('*');

const isWin = process.platform.includes('win');

export default class Resolver {
  cache = new Map();
  packageCache = new Map();
  exts = new Set<string>();
  rootPackage: any;
  /**
   * 类似webpack resolve alias
   * 但是只匹配字符串
   */
  alias = new Map<string, IAliasValue[]>();

  constructor(private options: IInitOptions) {
    if (options.alias) {
      const alias = options.alias;
      Object.keys(alias).forEach(key =>
        this.alias.set(key, [].concat(alias[key]))
      );
    }
  }

  async resolve(fileName: string, parent: any) {
    const cacheKey = this.getCacheKey(fileName, parent);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let exts = ['', ...this.options.extensions];

    if (parent) {
      const parentExt = path.extname(parent);
      exts = [parentExt, ...exts.filter(ext => ext !== parentExt)];
    }

    // console.log('resolve', fileName)
    // Resolve the module directory or local file path
    const module = await this.resolveModule(fileName, parent);
    const dir = parent ? path.dirname(parent) : process.cwd();
    let resolved: {
      path: any;
      pkg: any;
    };

    if ('moduleDir' in module && module.moduleDir) {
      resolved = await this.loadNodeModules(module, exts);
    } else if (module.filePath) {
      resolved = await this.loadRelative(module.filePath, exts);
    } else if (parent) {
      module.filePath = path.resolve(dir, fileName);
      resolved = await this.loadRelative(module.filePath, exts);
    }

    if (!resolved) {
      const err = new Error(`Cannot find module '${fileName}' from '${dir}'`);
      // err.code = 'MODULE_NOT_FOUND';
      throw err;
    }

    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  getCacheKey(fileName: string, parent: any) {
    return (parent ? path.dirname(parent) : '') + ':' + fileName;
  }

  get isSameTarget() {
    return this.options.target === this.options.source;
  }

  /**
   * 解析是否有对应的跨平台文件，并返回
   *  目录
   *  |- index.js
   *  |- index.alipay.js
   *
   *   1. target = alipay
   *       index.js => ndex.alipay.js
   *   2. target = swan
   *      ndex.js => index.js
   */
  async resolvePlatformModule(fileName: string) {
    if (this.isSameTarget) {
      return fileName;
    }

    const { ext, name, dir } = path.parse(fileName);
    if (ext) {
      // index.js => index.target.js
      const targetFileName = `${dir}/${name}.${this.options.target}${ext}`;
      if (fs.existsSync(targetFileName)) {
        return targetFileName;
      }
    }

    return fileName;
  }

  async resolveModule(fileName: string, parent: any) {
    const dir = parent ? path.dirname(parent) : this.options.sourceDir;
    // If this isn't the entrypoint, resolve the input file to an absolute path
    if (parent) {
      fileName = this.resolveFilename(fileName, dir);
    }
    // Resolve aliases in the parent module for this file.
    fileName = await this.loadAlias(fileName, dir);
    fileName = pathToUnixType(fileName);
    // Return just the file path if this is a file, not in node_modules
    if (path.isAbsolute(fileName)) {
      // fix absolute root is project src
      if (fileName[0] === '/' && !fileName.includes(this.options.rootDir)) {
        return {
          filePath: path.resolve(this.options.sourceDir, fileName.slice(1))
        };
      }
      return {
        filePath: fileName
      };
    }

    // Resolve the module in node_modules
    let resolved;
    try {
      resolved = await this.findNodeModulePath(fileName, dir);
    } catch (err) {
      // ignore
      // tslint:disable-next-line:no-debugger
      debugger;
    }

    // If we couldn't resolve the node_modules path, just return the module name info
    if (!resolved) {
      const parts = this.getModuleParts(fileName);
      resolved = {
        moduleName: parts[0],
        subPath: parts[1]
      };
    }

    return resolved;
  }

  /**
   * find npm package in node_modules , ensure package amostly is same reference
   * 1. find package in root node_modules
   * 2. find package in dir nearly parent node_modules
   * 3. util find package or go back to 2.
   */
  async findNodeModulePath(filename: string, dir: string) {
    const parts = this.getModuleParts(filename);
    const root = path.parse(dir).root;
    const rootDir = this.options.rootDir;
    if (rootDir) {
      const result = await this.findModulePath(parts, rootDir, filename);
      if (result) {
        return result;
      }
    }

    while (dir !== root) {
      // Skip node_modules directories
      if (path.basename(dir) === 'node_modules' || dir === rootDir) {
        dir = path.dirname(dir);
      }

      try {
        // First, check if the module directory exists. This prevents a lot of unnecessary checks later.
        const result = await this.findModulePath(parts, dir, filename);
        if (result) {
          return result;
        }
      } catch (err) {
        // ignore
      }

      // Move up a directory
      dir = path.dirname(dir);
    }
  }

  private async findModulePath(parts: string[], dir: string, filename: string) {
    const moduleDir = path.join(dir, 'node_modules', parts[0]);

    if (fsExtra.existsSync(moduleDir)) {
      const stats = await promisify(fs.stat)(moduleDir);

      if (stats && stats.isDirectory()) {
        return {
          moduleName: parts[0],
          subPath: parts[1],
          moduleDir,
          filePath: path.join(dir, 'node_modules', filename)
        };
      }
    }
  }

  *expandFileGenerator(
    file: string,
    extensions: string[],
    pkg: any,
    expandAliases = true
  ): IterableIterator<string> {
    for (const ext of extensions) {
      const f = file + ext;
      if (expandAliases) {
        const alias = this.resolveAliases(f, pkg);
        if (alias !== f) {
          yield* this.expandFileGenerator(alias, extensions, pkg, false);
        }
      }

      yield f;
    }
  }

  expandFile(
    file: string,
    extensions: string[],
    pkg: any,
    expandAliases = true
  ): any[] {
    return [...this.expandFileGenerator(file, extensions, pkg, expandAliases)];
  }

  async loadAsFile(file: string, extensions: string[], pkg: any) {
    // Try all supported extensions
    for (const f of this.expandFileGenerator(file, extensions, pkg)) {
      if (await this.isFile(f)) {
        return { path: f, pkg };
      }
    }
  }

  async loadRelative(filename: string, extensions: string[]) {
    // Find a package.json file in the current package.
    const pkg = await this.findPackage(path.dirname(filename));

    // First try as a file, then as a directory.
    return (
      (await this.loadAsFile(filename, extensions, pkg)) ||
      (await this.loadDirectory(filename, extensions, pkg))
    );
  }

  async loadNodeModules(module: any, extensions: string[]) {
    try {
      // If a module was specified as a module sub-path (e.g. some-module/some/path),
      // it is likely a file. Try loading it as a file first.
      if (module.subPath) {
        const pkg = await this.readPackage(module.moduleDir);
        const res = await this.loadAsFile(module.filePath, extensions, pkg);
        if (res) {
          return res;
        }
      }

      // Otherwise, load as a directory.
      return await this.loadDirectory(module.filePath, extensions);
    } catch (e) {
      // ignore
    }
  }

  async isFile(file: string) {
    try {
      const stat = await promisify(fs.stat)(file);
      return stat.isFile() || stat.isFIFO();
    } catch (err) {
      return false;
    }
  }

  getPackageEntries(pkg: any) {
    let browser = this.getBrowserField(pkg);
    if (browser && typeof browser === 'object' && browser[pkg.name]) {
      browser = browser[pkg.name];
    }

    // libraries like d3.js specifies node.js specific files in the "main" which breaks the build
    // we use the "browser" or "module" field to get the full dependency tree if available.
    // If this is a linked module with a `source` field, use that as the entry point.
    return [pkg.source, browser, pkg.main, pkg.module]
      .filter(entry => typeof entry === 'string')
      .map(main => {
        // Default to index file if no main field find
        if (!main || main === '.' || main === './') {
          main = 'index';
        }

        return path.resolve(pkg.pkgdir, main);
      });
  }

  async loadDirectory(
    dir: string,
    extensions: string[],
    pkg?: any
  ): Promise<{
    path: any;
    pkg: any;
  }> {
    try {
      pkg = await this.readPackage(dir);

      // Get a list of possible package entry points.
      const entries = this.getPackageEntries(pkg);

      for (const file of entries) {
        // First try loading package.main as a file, then try as a directory.
        const res =
          (await this.loadAsFile(file, extensions, pkg)) ||
          (await this.loadDirectory(file, extensions, pkg));
        if (res) {
          return res;
        }
      }
    } catch (err) {
      // ignore
    }

    // Fall back to an index file inside the directory.
    return await this.loadAsFile(path.join(dir, 'index'), extensions, pkg);
  }

  resolveFilename(fileName: string, dir: string) {
    try {
      if (path.isAbsolute(fileName)) {
        // resolve system absolute path;
        if (fsExtra.existsSync(fileName)) {
          return fileName;
        }
      }

      switch (fileName[0]) {
        case '/':
          // Absolute path. Resolve relative to project souceDir.
          const abFileName = path.resolve(
            this.options.sourceDir,
            fileName.slice(1)
          );
          if (fsExtra.existsSync(abFileName)) {
            return abFileName;
          }

          return fileName;

        case '~':
          // Tilde path. Resolve relative to nearest node_modules directory,
          // or the project root - whichever comes first.
          while (
            dir !== this.options.rootDir &&
            path.basename(path.dirname(dir)) !== 'node_modules'
          ) {
            dir = path.dirname(dir);
          }

          return path.join(dir, fileName.slice(1));

        case '.':
          // Relative path.
          return path.resolve(dir, fileName);

        default:
          // Module
          const fixedRelativeFileName = path.resolve(dir, fileName);
          if (fsExtra.existsSync(fixedRelativeFileName)) {
            return fixedRelativeFileName;
          }
          return path.normalize(fileName);
      }
    } catch (error) {
      // tslint:disable-next-line:no-debugger
      debugger;
    }
  }

  async loadAlias(fileName: string, dir: string) {
    // Load the root project's package.json file if we haven't already
    if (!this.rootPackage) {
      this.rootPackage = await this.findPackage(this.options.rootDir);
    }

    // Load the local package, and resolve aliases
    const pkg = await this.findPackage(dir);
    return (
      (await this.loadResolveAlias(fileName, dir)) ||
      this.resolveAliases(fileName, pkg)
    );
  }

  /**
   * resolve alias get relativepath
   * @param fileName
   * @param dir
   * @example
   *  @/utils/index => ../utils/index
   */
  loadResolveAlias(fileName: string, dir?: string) {
    // console.log(fileName,this.alias ,'loadResolveAlias');
    fileName = pathToUnixType(fileName);
    if (path.isAbsolute(fileName)) {
      return fileName;
    }
    for (const key of this.alias.keys()) {
      const match = matchAlias(key, fileName);
      if (match) {
        const target = this.alias.get(key);
        const [normalizedAlias] = normalizeAlias(target);
        // tsconfig paths
        if (key.includes('*') && match.length > 1) {
          fileName = normalizedAlias.path.replace(/\*/g, match[1]);
        } else {
          fileName = fileName.replace(key, normalizedAlias.path);
        }

        // if (dir) {
        //   const relativePath = path.relative(dir, fileName);
        //   return pathToUnixType(relativePath);
        // }
        return pathToUnixType(fileName);
      }
    }
    return;
  }

  resolveAliases(fileName: string, pkg: any) {
    // First resolve local package aliases, then project global ones.
    return this.resolvePackageAliases(
      this.resolvePackageAliases(fileName, pkg),
      this.rootPackage
    );
  }

  resolvePackageAliases(fileName: string, pkg: any) {
    if (!pkg) {
      return fileName;
    }

    // Resolve aliases in the package.source, package.alias, and package.browser fields.
    return (
      this.getAlias(fileName, pkg.pkgdir, pkg.source) ||
      this.getAlias(fileName, pkg.pkgdir, pkg.alias) ||
      this.getAlias(fileName, pkg.pkgdir, this.getBrowserField(pkg)) ||
      fileName
    );
  }

  getBrowserField(pkg: any) {
    const target = this.options.target || 'browser';
    return target === 'browser' ? pkg.browser : null;
  }

  getAlias(fileName: string, dir: string, aliases: any): string | null {
    if (!fileName || !aliases || typeof aliases !== 'object') {
      return null;
    }

    let alias;

    // If fileName is an absolute path, get one relative to the package.json directory.
    if (path.isAbsolute(fileName)) {
      fileName = path.relative(dir, fileName);
      if (fileName[0] !== '.') {
        fileName = './' + fileName;
      }

      alias = this.lookupAlias(aliases, fileName, dir);
    } else {
      // It is a node_module. First try the entire fileName as a key.
      alias = this.lookupAlias(aliases, fileName, dir);
      if (alias == null) {
        // If it didn't match, try only the module name.
        const parts = this.getModuleParts(fileName);
        alias = this.lookupAlias(aliases, parts[0], dir);
        if (typeof alias === 'string') {
          // Append the fileName back onto the aliased module.
          alias = path.join(alias, ...parts.slice(1));
        }
      }
    }

    // If the alias is set to `false`, return an empty file.
    if (alias === false) {
      return '';
    }

    return alias;
  }

  lookupAlias(aliases: any, fileName: string, dir: string) {
    // First, try looking up the exact fileName
    const alias = aliases[fileName];

    if (typeof alias === 'string') {
      return this.resolveFilename(alias, dir);
    }

    return alias;
  }

  async findPackage(dir: string) {
    // Find the nearest package.json file within the current node_modules folder
    const root = path.parse(dir).root;
    while (dir !== root && path.basename(dir) !== 'node_modules') {
      try {
        return await this.readPackage(dir);
      } catch (err) {
        // ignore
      }

      dir = path.dirname(dir);
    }
  }

  findPackageSync(dir: string) {
    // Find the nearest package.json file within the current node_modules folder
    const root = path.parse(dir).root;
    while (dir !== root && path.basename(dir) !== 'node_modules') {
      try {
        return this.readPackageSync(dir);
      } catch (err) {
        // ignore
      }

      dir = path.dirname(dir);
    }
  }

  async readPackage(dir: string) {
    const file = path.join(dir, 'package.json');
    if (this.packageCache.has(file)) {
      return this.packageCache.get(file);
    }

    const json = await promisify(fs.readFile)(file, { encoding: 'utf8' });
    const pkg = JSON.parse(json);

    pkg.pkgfile = file;
    pkg.pkgdir = dir;

    // If the package has a `source` field, check if it is behind a symlink.
    // If so, we treat the module as source code rather than a pre-compiled module.
    if (pkg.source) {
      const realpath = await promisify(fs.realpath)(file);
      if (realpath === file) {
        delete pkg.source;
      }
    }

    this.packageCache.set(file, pkg);
    return pkg;
  }

  readPackageSync(dir: string) {
    const file = path.join(dir, 'package.json');
    if (this.packageCache.has(file)) {
      return this.packageCache.get(file);
    }

    const json = fs.readFileSync(file, { encoding: 'utf8' });
    const pkg = JSON.parse(json);

    pkg.pkgfile = file;
    pkg.pkgdir = dir;

    // If the package has a `source` field, check if it is behind a symlink.
    // If so, we treat the module as source code rather than a pre-compiled module.
    if (pkg.source) {
      const realpath = fs.readFileSync(file, { encoding: 'utf8' });
      if (realpath === file) {
        delete pkg.source;
      }
    }

    this.packageCache.set(file, pkg);
    return pkg;
  }

  getModuleParts(name: string) {
    const parts = path.normalize(name).split(path.sep);
    if (parts[0].charAt(0) === '@') {
      // Scoped module (e.g. @scope/module). Merge the first two parts back together.
      parts.splice(0, 2, `${parts[0]}/${parts[1]}`);
    }

    return parts;
  }
}
