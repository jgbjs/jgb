import * as fs from 'fs';
import * as Path from 'path';
import * as Resolve from 'resolve';
import installPackage from './installPackage';

const cache = new Map();

const fallBackCache = new Map();

export default async function localRequire(
  name: string,
  path: string,
  triedInstall = false
) {
  const [resolved] = await localResolve(name, path, triedInstall);

  return require(resolved);
}

export async function localResolve(
  name: string,
  path: string,
  triedInstall = false
): Promise<[string, any]> {
  const basedir = fs.lstatSync(path).isDirectory() ? path : Path.dirname(path);
  const cacheKey = `${basedir}:${name}`;

  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  // tslint:disable-next-line:no-unused-expression
  const result = await new Promise<[string, any]>(resolve => {
    Resolve(name, { basedir }, async (err: any, res, pkg) => {
      if (err) {
        if (err.code === 'MODULE_NOT_FOUND' && !triedInstall) {
          const fn = fallBackCache.get(name);
          if (typeof fn === 'function') {
            return resolve([fn(), null]);
          } else {
            const packageName = getModuleParts(name)[0];
            await installPackage(packageName, path);
            return localResolve(name, path, true);
          }
        }
        throw err;
      }
      resolve([res, pkg]);
    });
  });

  cache.set(cacheKey, result);

  return result;
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

function getModuleParts(name: string) {
  let parts = Path.normalize(name).split(Path.sep);
  if (parts[0].charAt(0) === '@') {
    // Scoped module (e.g. @scope/module). Merge the first two parts back together.
    parts.splice(0, 2, `${parts[0]}/${parts[1]}`);
  }

  return parts;
}
