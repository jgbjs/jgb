import { Asset, IInitOptions } from 'jgb-shared/lib';
import * as json5 from 'json5';
import * as path from 'path';

export default class JsonAsset extends Asset {
  constructor(fileName: string, options: IInitOptions) {
    super(fileName, options);
  }

  static outExt = '.json';

  async parse(code: string) {
    return code ? json5.parse(code) : {};
  }

  async pretransform() {
    if(this.ast) {
      // TODO: transform json
    }
  }

  async collectDependencies() {
    const baseName = path.basename(this.name);
    if (baseName === 'app.json') {
      await this.collectAppJson(this.ast);
    } else {
      await this.collectPageJson(this.ast);
    }
  }

  async generate() {
    let code = this.contents;
    if (this.options.minify) {
      code = JSON.stringify(this.ast || {});
    } else {
      code = JSON.stringify(this.ast || {}, null, 2);
    }

    return {
      code,
      ext: JsonAsset.outExt
    };
  }

  async collectPageJson(page: any) {
    const dependences = new Set<string>();

    await this.compiler.emit('collect-page-json', {
      ctx: this,
      dependences,
      pageJson: page
    });

    for (const name of dependences) {
      this.addDependency(name);
    }
  }

  /**
   * 搜集 app.json 中页面配置和其他依赖资源
   * @param pkg
   */
  async collectAppJson(app: any) {
    const dependences = new Set<string>();

    await this.compiler.emit('collect-app-json', {
      ctx: this,
      dependences,
      appJson: app
    });

    for (const name of [...dependences]) {
      this.addDependency(name);
    }
  }

  /**
   * 查找满足条件的文件,扩展开文件名
   * @param fileNames
   * @param extensions
   */
  async expandFiles(
    fileNames: Set<string>,
    extensions: IterableIterator<string>
  ): Promise<Set<string>> {
    const dependences = new Set();
    const dir = path.dirname(this.name);
    const exts = [...extensions];

    for (let fileName of fileNames) {
      fileName = path.isAbsolute(fileName)
        ? fileName
        : path.resolve(dir, fileName);

      const files = this.resolver.expandFile(fileName, exts, {}, false);
      for (const file of files) {
        const isFile = await this.resolver.isFile(file);
        if (isFile) {
          dependences.add(file);
        }
      }
    }

    return dependences;
  }
}
