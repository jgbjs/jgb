import generate from '@babel/generator';
import * as babelParser from '@babel/parser';
import traverse from '@babel/traverse';
import * as walk from 'babylon-walk';
import * as fs from 'fs';
import { Asset, IInitOptions } from 'jgb-shared/lib';
import { logger } from 'jgb-shared/lib/Logger';
import SourceMap from 'jgb-shared/lib/SourceMap';
import { pathToUnixType } from 'jgb-shared/lib/utils';
import * as Path from 'path';
import * as path from 'path';
import { promisify } from 'util';
import babel7 from './babel7';
import getBabelConfig from './babelrc';
import npmHack from './npmHack';
import terser from './terser';
import babel from './transform';
import collectDependencies from './vistors/dependencies';
import envVisitor from './vistors/env';
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
    this.cacheData.env = {};
  }

  outputCode: string;
  waitResolveCollectDependencies: Array<Promise<any>> = [];
  isAstDirty = false;
  sourceMap: any;

  static outExt = '.js';

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
    return true;
    // return (
    //   !/.js$/.test(this.name) ||
    //   IMPORT_RE.test(this.contents) ||
    //   GLOBAL_RE.test(this.contents) ||
    //   SW_RE.test(this.contents) ||
    //   WORKER_RE.test(this.contents) ||
    //   this.isAstDirty
    // );
  }

  async parse(code: string) {
    return babelParser.parse(code, {
      // @ts-ignore
      filename: this.name,
      allowReturnOutsideFunction: true,
      strictMode: false,
      sourceType: 'unambiguous',
      plugins: [
        'exportDefaultFrom',
        'exportNamespaceFrom',
        'dynamicImport',
        'decorators-legacy',
        'nullishCoalescingOperator',
        'objectRestSpread',
        'optionalChaining',
        'classProperties',
        'asyncGenerators'
      ]
    });
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
    } = await this.resolveAliasName(name, BabelAsset.outExt);

    if (opts.node) {
      if (relativeRequirePath) {
        opts.node.value = relativeRequirePath;
      }
      const ext = Path.extname(opts.node.value);
      // .ts => .js
      if (ext && ext !== BabelAsset.outExt) {
        opts.node.value = opts.node.value.replace(ext, BabelAsset.outExt);
      }
    }
    opts.distPath = distPath;
    // avoid save large data or circle data
    super.addDependency(realName, { ...opts, node: null });
    resolveCollectDependency(relativeRequirePath);
  }

  /**
   * 替换env环境变量
   */
  async pretransform() {
    await this.loadSourceMap();
    await babel(this);

    // Inline environment variables
    if (this.options.target !== 'node' && ENV_RE.test(this.contents)) {
      await this.parseIfNeeded();
      this.traverseFast(envVisitor);
    }
  }

  traverse(visitor: any) {
    return traverse(this.ast, visitor, null, this);
  }

  async transform() {
    const babelrc: any = (await getBabelConfig(this, true)) || {};
    if (babelrc) {
      const config = babelrc.config || {};
      config.plugins = (config.plugins || []).concat([
        require('@babel/plugin-transform-modules-commonjs')
      ]);
      config.ignore = (config.ignore || []).concat(['node_modules']);

      await babel7(this, {
        internal: true,
        config
      });
    }

    if (this.options.minify) {
      await terser(this);
    }
  }

  async loadSourceMap() {
    // Get original sourcemap if there is any
    const match = this.contents.match(SOURCEMAP_RE);
    if (match) {
      this.contents = this.contents.replace(SOURCEMAP_RE, '');

      const url = match[1];
      const dataURLMatch = url.match(DATA_URL_RE);

      try {
        let json;
        let filename;
        if (dataURLMatch) {
          filename = this.name;
          json = Buffer.from(dataURLMatch[1], 'base64').toString();
        } else {
          filename = path.join(path.dirname(this.name), url);
          json = await promisify(fs.readFile)(filename);

          // Add as a dep so we watch the source map for changes.
          this.addDependency(filename, { includedInParent: true });
        }

        this.sourceMap = JSON.parse(json);

        // Attempt to read missing source contents
        if (!this.sourceMap.sourcesContent) {
          this.sourceMap.sourcesContent = [];
        }

        const missingSources = this.sourceMap.sources.slice(
          this.sourceMap.sourcesContent.length
        );
        if (missingSources.length) {
          const contents = await Promise.all(
            missingSources.map(async source => {
              try {
                const sourceFile = path.join(
                  path.dirname(filename),
                  this.sourceMap.sourceRoot || '',
                  source
                );
                const result = await promisify(fs.readFile)(sourceFile);
                this.addDependency(sourceFile, { includedInParent: true });
                return result;
              } catch (err) {
                logger.warning(
                  `Could not load source file "${source}" in source map of "${
                    this.relativeName
                  }".`
                );
              }
            })
          );

          this.sourceMap.sourcesContent = this.sourceMap.sourcesContent.concat(
            contents
          );
        }
      } catch (e) {
        logger.warning(
          `Could not load existing sourcemap of "${this.relativeName}".`
        );
      }
    }
  }

  async generate() {
    let code: string;
    if (this.isAstDirty) {
      // remove 'use strict'
      // this.ast.program.directives = (this.ast.program.directives || []).filter(
      //   d => {
      //     return !(
      //       d.type === 'Directive' &&
      //       d.value &&
      //       d.value.value === 'use strict'
      //     );
      //   }
      // );
      const opts = {
        sourceMaps: true,
        sourceFileName: pathToUnixType(this.relativeName)
      };

      const generated: any = generate(this.ast, opts, this.contents);
      code = generated.code;
      if (generated.map) {
        generated.map.sources = [pathToUnixType(this.relativeName)];
        generated.map.sourcesContent = [this.contents];
        const rawMap = await new SourceMap().addMap(generated.map);

        // Check if we already have a source map (e.g. from TypeScript or CoffeeScript)
        // In that case, we need to map the original source map to the babel generated one.
        this.sourceMap = !this.sourceMap
          ? rawMap
          : await new SourceMap().extendSourceMap(this.sourceMap, rawMap);
      }
    } else {
      code =
        typeof this.outputCode === 'string' ? this.outputCode : this.contents;
    }
    code = npmHack(this.basename, code);

    if (!this.sourceMap) {
      this.sourceMap = new SourceMap().generateEmptyMap(
        this.relativeName,
        this.contents
      );
    }

    if (!(this.sourceMap instanceof SourceMap)) {
      this.sourceMap = await new SourceMap().addMap(this.sourceMap);
    }

    return {
      code,
      map: this.sourceMap,
      ext: BabelAsset.outExt
    };
  }
}
