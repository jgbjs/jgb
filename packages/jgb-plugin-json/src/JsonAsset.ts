import { Asset, IInitOptions } from 'jgb-shared/lib';
import * as path from 'path';

interface IPageJson {
  usingComponents: {
    [componentName: string]: string;
  };
}

export default class JsonAsset extends Asset {
  constructor(fileName: string, options: IInitOptions) {
    super(fileName, options);
  }

  static outExt = '.json';

  async parse(code: string) {
    return code ? JSON.parse(code) : {};
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

  get compiler() {
    if (this.parentCompiler) {
      return this.parentCompiler;
    }
  }

  async collectPageJson(page: IPageJson) {
    // 是否使用组件
    if (!page.usingComponents || typeof page.usingComponents !== 'object') {
      return;
    }

    const extensions = this.options.parser.extensions as Map<string, any>;
    const supportExtensions = extensions.keys();
    const components = new Set(Object.values(page.usingComponents));
    const dependences = await this.expandFiles(components, supportExtensions);

    this.compiler.emit('collect-page-json', {
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
    const extensions = this.options.parser.extensions as Map<string, any>;
    const supportExtensions = extensions.keys();
    const pages: Set<string> = new Set(
      Array.isArray(app.pages) ? app.pages : []
    );
    const dependences = await this.expandFiles(pages, supportExtensions);

    this.compiler.emit('collect-app-json', {
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
    for (const fileName of fileNames) {
      const files = this.resolver.expandFile(
        path.resolve(dir, fileName),
        exts,
        {},
        false
      );
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
