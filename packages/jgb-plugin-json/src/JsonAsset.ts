import { Asset, IInitOptions } from 'jgb-shared/lib';
import { Utils } from 'jgb-shared';
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
    if (this.ast) {
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
      const { realName, distPath } = await this.resolveAliasName(name);
      this.addDependency(realName, { distPath });
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
      const { realName, distPath } = await this.resolveAliasName(name);
      this.addDependency(realName, { distPath });
    }
  }

  async collectAppDependJson(ctx: JsonAsset) {
    const dependences = new Set<string>();
    await this.compiler.emit('collect-app-json', {
      dependences,
      appJson: ctx.ast,
      ctx
    });

    for (const name of [...dependences]) {
      const { realName, distPath } = await this.resolveAliasName(name);
      this.addDependency(realName, { distPath });
    }

    return this.filterDependenices([...this.dependencies]);
    // return [...this.dependencies].filter((item) => new RegExp(/\.json$/).test(item[0]))
  }

  filterDependenices(dependencies: Array<any>, type = 'app') {
    const _initKeyName = (name: string) => {
      const cwd = Utils.pathToUnixType(process.cwd());
      return Utils.pathToUnixType(name)
        .replace(cwd, '')
        .replace('/src/', '')
        .replace('.json', '')
        .replace('/dist/', '')
        .replace('.js', '')
        .replace('.ts', '');
    };
    let hash: any = {};

    const _filter = (key: string, distPath: string) => {
      let _key = _initKeyName(key);
      if (!hash[_key]) {
        hash[_key] = {};
      }
      let currentData = hash[_key];
      if (/\.js$/.test(key)) {
        currentData.js = {
          path: key,
          distPath
        };
      }
      if (/\.ts$/.test(key)) {
        currentData.js = {
          path: key,
          distPath: distPath.replace('.ts', '.js')
        };
      }
      if (/\.json$/.test(key)) {
        currentData.json = {
          path: key,
          distPath
        };
      }
    };
    if (type === 'app') {
      const filterDependencies = [...dependencies].filter(item =>
        new RegExp(/(\.json$)|(\.js$)|(\.ts$)/).test(item[0])
      );
      filterDependencies.forEach(([key, { name, distPath }]: any) => {
        _filter(key, distPath);
      });
      return hash;
    }
    if (type === 'page') {
      const filterDependencies = [...dependencies].filter(item =>
        new RegExp(/(\.json$)|(\.js$)|(\.ts$)/).test(item)
      );
      filterDependencies.forEach((key: string) => {
        _filter(key, key);
      });
      return hash;
    }
  }

  async collectPageDependJson(ctx: JsonAsset) {
    const dependences = new Set<string>();

    await this.compiler.emit('collect-page-json', {
      dependences,
      pageJson: ctx.ast,
      ctx
    });

    return this.filterDependenices([...dependences], 'page');
    // return [...dependences].filter((item) => new RegExp(/\.json$/).test(item))
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
    const dependences = new Set<string>();
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
