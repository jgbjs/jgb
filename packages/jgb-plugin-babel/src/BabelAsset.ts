import * as Babel from 'babel-core';
import { File as BabelFile } from 'babel-core/lib/transformation/file';
import generate from 'babel-generator';
import traverse from 'babel-traverse';
// import * as t from 'babel-types';
import * as babylon from 'babylon';
import * as walk from 'babylon-walk';
import { Asset, IInitOptions } from 'jgb-shared/lib';
import * as Path from 'path';
import babel, { getConfig } from './babel';
import terser from './terser';
import collectDependencies from './vistors/dependencies';
import envVisitor from './vistors/env';
import fsVisitor from './vistors/fs';
import insertGlobals from './vistors/globals';

const IMPORT_RE = /\b(?:import\b|export\b|require\s*\()/;
const ENV_RE = /\b(?:process\.env)\b/;
const GLOBAL_RE = /\b(?:process|__dirname|__filename|global|Buffer|define)\b/;
const FS_RE = /\breadFileSync\b/;
const SW_RE = /\bnavigator\s*\.\s*serviceWorker\s*\.\s*register\s*\(/;
const WORKER_RE = /\bnew\s*Worker\s*\(/;
const SOURCEMAP_RE = /\/\/\s*[@#]\s*sourceMappingURL\s*=\s*([^\s]+)/;
const DATA_URL_RE = /^data:[^;]+(?:;charset=[^;]+)?;base64,(.*)/;

export default class BabelAsset extends Asset {
  constructor(fileName: string, options: IInitOptions) {
    super(fileName, options);
  }

  babelConfig: any;
  babelFile: any;
  outputCode: string;
  waitResolveCollectDependencies: Array<Promise<any>> = [];
  isAstDirty = false;

  static outExt = '.js';

  async getParserOptions(): Promise<any> {
    // Babylon options. We enable a few plugins by default.
    const options = {
      filename: this.name,
      allowReturnOutsideFunction: true,
      allowHashBang: true,
      ecmaVersion: Infinity,
      strictMode: false,
      sourceType: 'module',
      locations: true,
      plugins: ['exportExtensions', 'dynamicImport']
    };

    // Check if there is a babel config file. If so, determine which parser plugins to enable
    this.babelConfig = await getConfig(this);
    if (this.babelConfig) {
      const file = new BabelFile(this.babelConfig);
      options.plugins.push(...file.parserOpts.plugins);
    }

    return options;
  }

  shouldInvalidate(cacheData: any) {
    if (cacheData && cacheData.env) {
      for (const key in cacheData.env) {
        if (cacheData.env[key] !== process.env[key]) {
          return true;
        }
      }
    }

    return false;
  }

  mightHaveDependencies() {
    return (
      this.isAstDirty ||
      !/.js$/.test(this.name) ||
      IMPORT_RE.test(this.contents) ||
      GLOBAL_RE.test(this.contents) ||
      SW_RE.test(this.contents) ||
      WORKER_RE.test(this.contents)
    );
  }

  async parse(code: string): Promise<Babel.types.File> {
    const options: babylon.BabylonOptions = await this.getParserOptions();
    return babylon.parse(code, options);
  }

  async collectDependencies() {
    walk.ancestor(this.ast, collectDependencies, this);

    await Promise.all(this.waitResolveCollectDependencies);

    this.waitResolveCollectDependencies = [];
  }

  traverseFast(visitor: any) {
    return walk.simple(this.ast, visitor, this);
  }

  async addDependency(name: string, opts: any = {}) {
    let resolveCollectDependency: any;
    // tslint:disable-next-line:no-unused-expression
    this.waitResolveCollectDependencies.push(
      new Promise(r => (resolveCollectDependency = r))
    );

    const {
      realName,
      relativeRequirePath,
      distPath
    } = await this.resolveAliasName(name);
    
    if (relativeRequirePath) {
      opts.node.value = relativeRequirePath;
    }

    // avoid save large data or circle data
    delete opts.node;

    opts.distPath = distPath;

    super.addDependency(realName, opts);
    resolveCollectDependency(relativeRequirePath);
  }

  /**
   * 替换env环境变量
   */
  async pretransform() {
    // await this.loadSourceMap();
    await babel(this);

    // Inline environment variables
    if (this.options.target === 'browser' && ENV_RE.test(this.contents)) {
      await this.parseIfNeeded();
      this.traverseFast(envVisitor);
    }
  }

  traverse(visitor: any) {
    // Create a babel File object if one hasn't been created yet.
    // This is needed so that cached NodePath objects get a `hub` object on them.
    // Plugins like babel-minify depend on this to get the original source code string.
    if (!this.babelFile) {
      this.babelFile = new BabelFile(this.babelConfig || {});
      this.babelFile.addCode(this.contents);
      this.babelFile.addAst(this.ast);
    }

    return traverse(this.ast, visitor, null, this);
  }

  async transform() {
    if (this.options.target === 'browser') {
      if (this.dependencies.has('fs') && FS_RE.test(this.contents)) {
        // Check if we should ignore fs calls
        // See https://github.com/defunctzombie/node-browser-resolve#skip
        const pkg = await this.getPackage();
        const ignore = pkg && pkg.browser && pkg.browser.fs === false;

        if (!ignore) {
          await this.parseIfNeeded();
          this.traverse(fsVisitor);
        }
      }

      if (GLOBAL_RE.test(this.contents)) {
        await this.parseIfNeeded();
        walk.ancestor(this.ast, insertGlobals, this);
      }
    }

    // if (this.options.scopeHoist) {
    //   await this.parseIfNeeded();
    //   await this.getPackage();

    //   this.traverse(hoist);
    //   this.isAstDirty = true;
    // } else {
    //   if (this.isES6Module) {
    //     await babel(this);
    //   }
    // }

    await babel(this);

    if (this.options.minify) {
      await terser(this);
    }
  }

  async generate() {
    let code: string;
    if (this.isAstDirty) {
      const opts = {
        sourceMaps: false,
        sourceFileName: this.relativeName
      };

      const generated = generate(this.ast, opts, this.contents);
      code = generated.code;
    } else {
      code = this.outputCode != null ? this.outputCode : this.contents;
    }

    return {
      code,
      ext: BabelAsset.outExt
    };
  }
}

function complementExt(filePath: string, defaultExt = '.js') {
  const ext = Path.extname(filePath);
  const containsExtName = ext ? filePath : `${filePath}${defaultExt}`;
  return containsExtName;
}
