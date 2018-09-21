import * as glob from 'fast-glob';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import * as isGlob from 'is-glob';
import { logger } from 'jgb-shared/lib/Logger';
import { md5, objectHash } from 'jgb-shared/lib/utils';
import * as mkdir from 'mkdirp';
import * as path from 'path';
import { promisify } from 'util';
import * as VError from 'verror';
import * as pkg from '../package.json';

// These keys can affect the output, so if they differ, the cache should not match
const OPTION_KEYS: string[] = [
  'alias',
  'target',
  'presets',
  'target',
  // 'publicURL',
  // 'minify',
  // 'hmr',
  // 'scopeHoist'
];

const mkdirp = promisify(mkdir);
const statp = promisify(fs.stat);

export default class FSCache {
  dir: string;
  dirExistsPromise: Promise<void>;
  invalidated = new Set();
  optionsHash: any;

  constructor(options: any) {
    this.dir = path.resolve(options.cacheDir || '.cache');
    const hash = OPTION_KEYS.reduce((p: any, k) => ((p[k] = options[k]), p), {
      version: pkg.version
    });
    this.optionsHash = objectHash(hash);

    this.ensureDirExists();
  }

  async ensureDirExists() {
    if (this.dirExistsPromise) {
      return this.dirExistsPromise;
    }

    const task = async () => {
      await mkdirp(this.dir);

      // Create sub-directories for every possible hex value
      // This speeds up large caches on many file systems since there are fewer files in a single directory.
      for (let i = 0; i < 256; i++) {
        await mkdirp(path.join(this.dir, ('00' + i.toString(16)).slice(-2)));
      }
    };

    this.dirExistsPromise = task();
  }

  async getCacheFile(filename: string) {
    const hash = md5((await this.optionsHash) + filename);
    return path.join(this.dir, hash.slice(0, 2), hash.slice(2) + '.json');
  }

  getLastModifiedSync(filename: string) {
    const stat = fs.statSync(filename);

    return stat.mtime.getTime();
  }

  async getLastModified(filename: string) {
    // if (isGlob(filename)) {
    //
    //   const files = await glob(filename, {
    //     onlyFiles: true
    //   });

    //   return (await Promise.all(
    //     files.map((file: any) =>
    //       statp(file).then(({ mtime }) => mtime.getTime())
    //     )
    //   )).reduce((a, b) => Math.max(a, b), 0);
    // }
    const stat = await statp(filename);

    return stat.mtime.getTime();
  }

  async writeDepMtimes(data: any) {
    // Write mtimes for each dependent file that is already compiled into this asset
    const dependencies = data.dependencies;

    if (dependencies instanceof Map) {
      for (const [key, dep] of dependencies) {
        if (dep && dep.includedInParent) {
          try {
            dep.mtime = this.getLastModifiedSync(dep.name);
          } catch (error) {
            logger.error(VError.fullStack(error));
          }
        }
      }
    }
  }

  async write(filename: string, data: any) {
    try {
      await this.ensureDirExists();
      await this.writeDepMtimes(data);
      const cacheFile = await this.getCacheFile(filename);
      if (data.dependencies instanceof Map) {
        data.dependencies = [...data.dependencies].map(([fileName, asset]) => {
          return [fileName, { ...asset, asset: null }];
        });
      } else if (Array.isArray(data.dependencies)) {
        data.dependencies = [...data.dependencies].map(asset => {
          return [asset.name, { ...asset, asset: null }];
        });
      }
      await fsExtra.writeFile(cacheFile, JSON.stringify(data));
      this.invalidated.delete(filename);
    } catch (err) {
      err.name = 'FSCache Error write cache';
      logger.error(VError.fullStack(err));
    }
  }

  async checkDepMtimes(data: any) {
    // Check mtimes for files that are already compiled into this asset
    // If any of them changed, invalidate.
    if (Array.isArray(data.dependencies)) {
      for (const [assetName, dep] of new Set<any>(data.dependencies)) {
        if (dep && dep.includedInParent) {
          if ((await this.getLastModified(dep.name)) > dep.mtime) {
            return false;
          }
        }
      }
    }

    return true;
  }

  async read(filename: string) {
    if (this.invalidated.has(filename)) {
      return null;
    }

    const cacheFile = await this.getCacheFile(filename);

    try {
      const stats = await statp(filename);
      const cacheStats = await statp(cacheFile);

      if (stats.mtime > cacheStats.mtime) {
        return null;
      }

      const json = await promisify(fs.readFile)(cacheFile, {
        encoding: 'utf-8'
      });
      const data = JSON.parse(json);
      if (!(await this.checkDepMtimes(data))) {
        return null;
      }

      return data;
    } catch (err) {
      // logger.error(`cannot found ${filename}'s cacheFile: ${cacheFile}`);
      return null;
    }
  }

  invalidate(filename: string) {
    this.invalidated.add(filename);
  }

  async delete(filename: string) {
    try {
      const cacheFile = await this.getCacheFile(filename);
      await promisify(fs.unlink)(cacheFile);
      this.invalidated.delete(filename);
    } catch (err) {
      // Fail silently
    }
  }
}
