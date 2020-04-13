import * as fs from 'fs';
import * as Path from 'path';
import Resolve = require('resolve');

const cache = new Map();

const fallBackCache = new Map();

export default async function localRequire(
  name: string,
  path: string,
  triedInstall = false
) {
  const basedir = fs.lstatSync(path).isDirectory() ? path : Path.dirname(path);
  const cacheKey = `${basedir}||${name}`;

  if (cache.has(cacheKey)) {
    return require(cache.get(cacheKey));
  }

  // tslint:disable-next-line:no-unused-expression
  const resolved: string = await new Promise<string>(resolve => {
    Resolve(name, { basedir }, (err: any, res) => {
      if (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
          const fn = fallBackCache.get(name);
          if (typeof fn === 'function') {
            return resolve(fn());
          }
        }
        throw err;
      }
      resolve(res);
    });
  });

  cache.set(cacheKey, resolved);

  return require(resolved);
}

export async function safeLocalRequire(
  name: string,
  path: string,
  fn: () => any
) {
  try {
    const cacheKey = name;

    fallBackCache.set(cacheKey, fn);

    return await localRequire(name, path);
  } catch (error) {
    return fn();
  }
}
