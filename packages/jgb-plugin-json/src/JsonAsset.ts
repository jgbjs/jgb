import { Asset, IInitOptions } from 'jgb-shared/lib';
import * as path from 'path';

interface IAppJsonTabarListConfg {
  pagePath: string;
  text: string;
  iconPath: string;
  selectedIconPath: string;
}

interface IAppJson {
  pages: string[];
  tabBar: {
    color: string;
    selectedColor: string;
    backgroundColor: string;
    borderStyle: string;
    list: IAppJsonTabarListConfg[];
    position: string;
  };
}

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

  async collectPageJson(page: IPageJson) {
    if (!page.usingComponents) {
      return;
    }

    const extensions = this.options.parser.extensions as Map<string, any>;
    const supportExtensions = extensions.keys();
    const components = new Set(Object.values(page.usingComponents));
    const dependences = await this.expandFiles(components, supportExtensions);

    for (const name of dependences) {
      this.addDependency(name);
    }
  }

  /**
   * 搜集 app.json 中页面配置和其他依赖资源
   * @param pkg
   */
  async collectAppJson(app: IAppJson) {
    const extensions = this.options.parser.extensions as Map<string, any>;
    const supportExtensions = extensions.keys();
    const pages = new Set(app.pages || []);
    const dependences = await this.expandFiles(pages, supportExtensions);

    const rawAssets = new Set();

    if (app.tabBar && app.tabBar.list) {
      app.tabBar.list.forEach(config => {
        dependences.add(config.pagePath);
        // tslint:disable-next-line:no-unused-expression
        config.iconPath && rawAssets.add(path.join('./', config.iconPath));
        // tslint:disable-next-line:no-unused-expression
        config.selectedIconPath &&
          rawAssets.add(path.join('./', config.selectedIconPath));
      });
    }

    for (const name of [...rawAssets, ...dependences]) {
      this.addDependency(name);
    }
  }

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
