import * as fs from 'fs-extra';
import * as path from 'path';
import { IInitOptions } from '../typings/jgb-shared';
import Asset from './Asset';
import * as md5 from './utils/md5';

export default class StaticAsset extends Asset {
  constructor(name: string, options: IInitOptions) {
    super(name, options);
  }

  // tslint:disable-next-line:no-empty
  async loadIfNeeded() {}

  // tslint:disable-next-line:no-empty
  async parse() {}

  mightHaveDependencies() {
    return false;
  }

  async output() {
    const distPath = this.distPath || this.generateDistPath(this.name);

    this.distPath = distPath;
    this.hash = await this.generateHash();
    let ignore = true;

    const prettyDistPath = path.relative(this.options.outDir, distPath);

    try {
      const isExist = await fs.pathExists(distPath);
      if (!(isExist && (await md5.file(distPath)) === this.hash)) {
        ignore = false;
      }
    } catch (error) {
      ignore = false;
    }

    if (!ignore) {
      await fs.ensureDir(path.dirname(distPath));
      const readable = fs.createReadStream(this.name);
      const writable = fs.createWriteStream(distPath);
      readable.pipe(writable);
    }

    return {
      distPath: prettyDistPath,
      ignore
    };
  }

  async generateHash() {
    return await md5.file(this.name);
  }
}
