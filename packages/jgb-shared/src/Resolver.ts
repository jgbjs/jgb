import {
  CachedInputFileSystem,
  NodeJsInputFileSystem,
  ResolverFactory
} from 'enhanced-resolve';
import { Dictionary } from 'enhanced-resolve/lib/concord';
import TypedResolver = require('enhanced-resolve/lib/Resolver');
import * as glob from 'fast-glob';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import { memoize } from 'lodash';
import * as path from 'path';
import { promisify } from 'util';
import { IAliasValue, IInitOptions } from '../typings/jgb-shared';
import { normalizeAlias, pathToUnixType } from './utils';
import { matchAlias } from './utils/matchAlias';

// debug.enable('*');

interface IResolveResult {
  path: string;
  pkg: any;
}

const cachedInputFileSystem = new CachedInputFileSystem(
  new NodeJsInputFileSystem(),
  4000
);

const defaultExts = ['.wxs', '.js', '.json', '.wxss', '.wxml'];

export default class NewResolver {
  resolver: TypedResolver;
  packageCache = new Map();
  alias: Dictionary<string> = {};

  constructor(private options: IInitOptions) {
    const alias = Object.assign(
      {},
      resolveTsconfigPathsToAlias(options.alias || {}, this.options.sourceDir)
    );

    const extensions = new Set([
      ...defaultExts,
      ...(this.options.extensions || [])
    ]);

    const resolveOpt = Object.assign(
      {
        // @ts-ignore
        fileSystem: cachedInputFileSystem,
        extensions: [...extensions],
        modules: [
          // precedence resolve root node_modules
          path.resolve(this.options.rootDir, 'node_modules'),
          'node_modules'
        ],
        mainFields: ['browser', 'main'],
        alias
      },
      options.resolve || {}
    );
    this.resolver = ResolverFactory.createResolver(resolveOpt);

    this.alias = alias;
  }

  private async innerResolve(
    fileName: string,
    parent: string
  ): Promise<IResolveResult> {
    const dir = parent ? path.dirname(parent) : this.options.sourceDir;
    return new Promise((r, reject) => {
      const context = {};
     
      this.resolver.resolve(
        context,
        dir,
        fileName,
        {},
         // @ts-ignore
        async (err, filepath) => {
          if (err) {
            return reject(err);
          }

          r({
            path: pathToUnixType(filepath),
            pkg: await this.findPackage(path.dirname(filepath))
          });
        }
      );
    });
  }

  async resolve(fileName: string, parent?: string): Promise<IResolveResult> {
    try {
      // /absolute/path => sourceDir/absolute/path
      if (fileName.startsWith('/') && !this.isAbsolute(fileName)) {
        const relativeFileName = `./${path.join('.', fileName)}`;
        return await this.innerResolve(
          relativeFileName,
          path.join(this.options.sourceDir, 'temp')
        );
      }
    } catch (error) {}

    try {
      return await this.innerResolve(fileName, parent);
    } catch (error) {
      // relative/path => ./relative/path
      if (!path.isAbsolute(fileName) && !fileName.startsWith('.')) {
        const relativeFileName = `./${path.join('.', fileName)}`;
        try {
          return await this.innerResolve(relativeFileName, parent);
        } catch (error) {}
      }
      throw error;
    }
  }

  async resolveModule(fileName: string, parent: any) {
    const dir = parent ? path.dirname(parent) : this.options.sourceDir;
    fileName = this.loadResolveAlias(fileName, parent);
    // If this isn't the entrypoint, resolve the input file to an absolute path
    if (parent) {
      fileName = this.resolveFilename(fileName, dir);
    }
    // Return just the file path if this is a file, not in node_modules
    if (this.isAbsolute(fileName)) {
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
   * 判断是否真实的绝对路径
   * 小程序中绝对路径的根目录 往往解析到小程序项目的目录
   */
  isAbsolute = memoize(function(fileName: string) {
    return (
      (fileName[0] === '/' && fileName.includes(this.options.sourceDir)) ||
      (fileName[0] !== '/' && path.isAbsolute(fileName))
    );
  });

  /**
   * componets/comp => components/comp.*
   * /componets/comp => components/comp.*
   */
  expandFile(
    file: string,
    extensions: string[],
    pkg?: any,
    expandAliases = true
  ) {
    const fileName = this.loadResolveAlias(file);

    let extGlob = '';

    const isAbsolutePath = this.isAbsolute(fileName);
    // is real absolute path
    if (isAbsolutePath) {
      extGlob = `${fileName}.{${extensions
        .map(ext => ext.slice(1))
        .join(',')}}`;
    } else {
      extGlob = path.join(
        '.',
        `${fileName}.{${extensions.map(ext => ext.slice(1)).join(',')}}`
      );
    }

    extGlob = pathToUnixType(extGlob);

    // componets/comp => components/comp.*
    return glob.sync([fileName, extGlob], {
      onlyFiles: true,
      unique: true,
      cwd: this.options.sourceDir
    }) as string[];
  }

  resolveFilename = memoize(
    (fileName: string, dir: string) => {
      const result = this.innerResolveFilename(fileName, dir);
      if (typeof result === 'string' && result) {
        return pathToUnixType(result);
      }
      return fileName;
    },
    (...args: string[]) => args.join('-')
  );

  private innerResolveFilename(fileName: string, dir: string) {
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

          const hasExt = path.extname(fileName);

          if (fsExtra.existsSync(abFileName)) {
            return abFileName;
          }

          if (!hasExt) {
            for (const ext of this.options.extensions) {
              const abFileNameWithExt = `${abFileName}${ext}`;
              if (fsExtra.existsSync(abFileNameWithExt)) {
                return abFileNameWithExt;
              }
            }
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

  getModuleParts(name: string) {
    const parts = path.normalize(name).split(path.sep);
    if (parts[0].charAt(0) === '@') {
      // Scoped module (e.g. @scope/module). Merge the first two parts back together.
      parts.splice(0, 2, `${parts[0]}/${parts[1]}`);
    }

    return parts;
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

  async isFile(file: string) {
    try {
      const stat = await promisify(fs.stat)(file);
      return stat.isFile() || stat.isFIFO();
    } catch (err) {
      return false;
    }
  }

  /**
   * resolve alias get relativepath
   * @param fileName
   * @param dir
   * @example
   *  @/utils/index => ../utils/index
   */
  loadResolveAlias(fileName: string, dir?: string) {
    fileName = pathToUnixType(fileName);
    if (path.isAbsolute(fileName)) {
      return fileName;
    }

    for (const key of Object.keys(this.alias)) {
      const match = matchAlias(key, fileName);
      if (match) {
        const target = this.alias[key];
        fileName = fileName.replace(key, target);

        return pathToUnixType(fileName);
      }
    }
    return fileName;
  }

  get isSameTarget() {
    return this.options.target === this.options.source;
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
}

export function resolveTsconfigPathsToAlias(
  alias: IInitOptions['alias'],
  resolveBase = process.cwd()
) {
  const aliases = {} as Dictionary<string>;
  const keys = Object.keys(alias);
  keys.forEach(item => {
    const key = item.replace('/*', '');
    let value = '';
    const v = alias[item];
    if (Array.isArray(v)) {
      value = resolveAlias(v[0], resolveBase);
    } else {
      value = resolveAlias(v, resolveBase);
    }

    aliases[key] = value;
  });

  return aliases;
}

function resolveAlias(v: IAliasValue, resolveBase: string) {
  if (typeof v === 'string') {
    return path.resolve(resolveBase, v.replace('/*', '').replace('*', ''));
  } else {
    return path.resolve(resolveBase, v.path.replace('/*', '').replace('*', ''));
  }
}

/**
 * alias  sort
 * 先按照 jgb.config.js 中的 alias 优先
 * 其次 tsconfig.json 中的 path
 * 再根据字符长度由长到短排序 （优先匹配）
 */
export function sortAliasKeys(alias: IInitOptions['alias']): string[] {
  const keys = Object.keys(alias);
  const originAliasKeys = keys
    .filter(key => !key.includes('*'))
    .sort((a1, a2) => a2.length - a1.length);
  const tsconfigAliasKeys = keys
    .filter(key => key.includes('*'))
    .sort((a1, a2) => a2.length - a1.length);
  return originAliasKeys.concat(tsconfigAliasKeys);
}
