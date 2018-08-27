import * as fs from 'fs-extra';
import * as path from 'path';
import { IInitOptions } from '../typings/jgb-shared';
import Asset from './Asset';

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

    const prettyDistPath = path.relative(this.options.outDir, distPath);

    await fs.ensureDir(path.dirname(distPath));

    const readable = fs.createReadStream(this.name);
    const writable = fs.createWriteStream(distPath);
    readable.pipe(writable);

    return {
      distPath: prettyDistPath
    };
  }
}
