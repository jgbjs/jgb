import * as fs from 'fs';
import * as json5 from 'json5';
import * as _ from 'lodash';
import * as path from 'path';
import { promisify } from 'util';

const PARSERS: {
  [key: string]: any;
} = {
  json: json5.parse
};

const existsCache = new Map();

export async function resolve(
  filepath: string,
  filenames: string[],
  root = path.parse(filepath).root
): Promise<any> {
  try {
    if (!fs.lstatSync(filepath).isDirectory()) {
      filepath = path.dirname(filepath);
    }
  } catch (error) {
    filepath = path.dirname(filepath);
  }

  // Don't traverse above the module root
  if (filepath === root || path.basename(filepath) === 'node_modules') {
    return null;
  }

  for (const filename of filenames) {
    const file = path.join(filepath, filename);
    const exists = existsCache.has(file)
      ? existsCache.get(file)
      : await promisify(fs.exists)(file);
    if (exists) {
      existsCache.set(file, true);
      return file;
    }
  }

  return resolve(path.dirname(filepath), filenames, root);
}

export async function load(
  filepath: string,
  filenames: string[],
  root = path.parse(filepath).root
) {
  const configFile = await resolve(filepath, filenames, root);
  if (configFile) {
    try {
      const extname = path.extname(configFile).slice(1);
      if (extname === 'js') {
        return _.cloneDeep(require(configFile));
      }

      const configContent = (await promisify(fs.readFile)(
        configFile
      )).toString();
      const parse = PARSERS[extname] || PARSERS.json;
      return configContent ? parse(configContent) : null;
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
        existsCache.delete(configFile);
        return null;
      }

      throw err;
    }
  }

  return null;
}
