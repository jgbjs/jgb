import * as Path from 'path'
import * as fs from 'fs'
import * as babel from 'babel-core';
import * as path from 'path'
import {getJGBConfig} from '../config';
import AwaitEventEmitter from "jgb-shared/lib/awaitEventEmitter";
import {Asset, IInitOptions, Resolver} from "jgb-shared/lib";
import {normalizeAlias, pathToUnixType} from "jgb-shared/lib/utils/index";
import Compiler from "../Compiler";
import ora from 'ora'
import chalk from 'chalk'

interface IAppJsonTabarListConfg {
  pagePath: string;
  text: string;
  iconPath: string;
  selectedIconPath: string;
}

interface IAppTabBar {
  color: string;
  selectedColor: string;
  backgroundColor: string;
  borderStyle: string;
  list: IAppJsonTabarListConfg[];
  position: string;
}

interface IAppJson {
  pages: string[];
  tabBar: IAppTabBar;
  subPackages: Array<{
    root: string;
    pages: string[];
  }>;
}

function aliasResolve(options: IInitOptions, root: string) {
  const alias = options.alias || {};
  const newAlias: { [key: string]: any } = {};
  /**
   * 先排序 字符长度由长到短排序 （优先匹配）
   * 再补充 resolve(aliasValue)
   */
  Object.keys(alias)
    .sort((a1, a2) => a2.length - a1.length)
    .forEach(key => {
      const aliasValue = normalizeAlias(alias[key]);
      const aliasPath = aliasValue.path;
      if (!Path.isAbsolute(aliasPath)) {
        if (aliasPath.startsWith('.')) {
          aliasValue.path = pathToUnixType(Path.resolve(root, aliasPath));
        } else {
          aliasValue.path = pathToUnixType(
            Path.resolve(root, 'node_modules', aliasPath)
          );
        }
      }

      newAlias[key] = aliasValue;
    });
  return newAlias;
}

function getNodeName(node: any): string {
  return node.name
}

async function collectAppJson({
                                dependences,
                                appJson,
                                ctx
                              }: {
  dependences: Set<string>;
  appJson: IAppJson;
  ctx: any;
}) {
  const extensions = ctx.options.parser.extensions as Map<string, any>;
  const supportExtensions = extensions.keys();
  const assetPaths: string[] = [];

  // pages asset
  if (Array.isArray(appJson.pages)) {
    assetPaths.push(...appJson.pages);
  }

  // subPackages asset
  if (Array.isArray(appJson.subPackages)) {
    // tslint:disable-next-line:no-shadowed-variable
    appJson.subPackages.forEach(({root, pages}) => {
      const subPackagePages = pages.map(page => Path.join(root, page));
      assetPaths.push(...subPackagePages);
    });
  }

  // expandFiles
  if (Array.isArray(assetPaths)) {
    for (const dep of await ctx.expandFiles(
      new Set(assetPaths),
      supportExtensions
    )) {
      dependences.add(dep);
    }
  }

  // tabBar asset
  if (appJson.tabBar && Array.isArray(appJson.tabBar.list)) {
    appJson.tabBar.list.forEach(config => {
      // tslint:disable-next-line:no-unused-expression
      config.iconPath && dependences.add(config.iconPath);
      // tslint:disable-next-line:no-unused-expression
      config.selectedIconPath && dependences.add(config.selectedIconPath);
    });
  }
}

class Core extends AwaitEventEmitter {
  private currentDir = process.cwd();
  private loadedAssets = new Map<string, Asset>();
  private options: IInitOptions;
  private entryFiles: string[];

  resolver: Resolver;
  compiler: Compiler;

  constructor(options: IInitOptions) {
    super()
    this.options = this.normalizeOptions(options);
    this.resolver = new Resolver(this.options);
    this.compiler = new Compiler(this.options);
  }


  normalizeOptions(options: IInitOptions): IInitOptions {
    const rootDir = Path.resolve(options.rootDir || this.currentDir);
    return {
      plugins: options.plugins,
      presets: options.presets,
      watch: !!options.watch,
      rootDir,
      useLocalWorker: !!options.useLocalWorker,
      outDir: Path.resolve(options.outDir || 'dist'),
      npmDir: Path.resolve(options.npmDir || 'node_modules'),
      entryFiles: [].concat(options.entryFiles),
      cache: !!options.cache,
      sourceDir: Path.resolve(options.sourceDir || 'src'),
      alias: aliasResolve(options, rootDir),
      minify: !!options.minify,
      source: options.source || 'wx',
      target: options.target || 'wx',
      lib: options.lib
    };
  }

  normalizeEntryFiles() {
    return []
      .concat(this.options.entryFiles || [])
      .filter(Boolean)
      .map(f => Path.resolve(this.options.sourceDir, f));
  }

  // 获取对应page.js文件的字符串
  getJs(path: string) {
    return fs.readFileSync(path + '.js', 'utf-8')
  }

  async scan() {
    const spinner = ora('start scanning')
    await this.init()
    const allPagePaths = await this._scanAppJson()
    // fs.writeFileSync('./res1.json', JSON.stringify(allPagePaths, null, 2))
    const ast = await Promise.all(Object.keys(allPagePaths).map(async (key: string) => {
      const collectComponents = async (components: any) => {
        let dic: any[] = []
        if (Object.keys(components).length > 0) {
          dic = await Promise.all(Object.keys(components).map(async (key: string) => {
            const current = components[key]

            const json = current['json']
            const js = current['js']
            const asset: any = await await this.resolveAsset(json.distPath)
            await asset.getDependencies()
            const _components = await asset.collectPageDependJson(asset)
            return {
              path: key,
              methods: await processJs(js.distPath),
              components: await collectComponents(_components),
            }
          }))
        }
        return dic
      }

      const _resolve = async (path: string) => {
        const asset: any = await this.resolveAsset(path);
        await asset.getDependencies()
        return asset
      }

      const processJs = async (path: string) => {
        const code = fs.readFileSync(path, 'utf-8')
        const ast = babel.transform(code, {
          sourceType: "module"
        }).ast
        const funcNames: string[] = []
        babel.traverse(ast, {
          ObjectProperty: (path, state) => {
            const node: any = path.node
            const {key, value}: any = node
            // 移除computed里面的方法
            if (key.name === 'computed') {
              value.properties.forEach((property: any) => {
                property.filter = true
              })
            }

            if (babel.types.isFunctionExpression(value) && !node.filter && key.name !== 'observer') {
              funcNames.push(getNodeName(key))
            }
          },
          AssignmentExpression: ((path, state) => {
            const {node}: any = path
            const {left}: any = node
            if (babel.types.isMemberExpression(left)) {
              const {object, property}: any = left
              if (object && object.property
                && babel.types.isIdentifier(object.property) && object.property.name === 'prototype') {
                if (left.property && babel.types.isIdentifier(left.property)) {
                  funcNames.push(getNodeName(left.property))
                }
              }
            }
          })
        })

        return funcNames
      }
      const processJson = async (path: string) => {
        const asset: any = await _resolve(path)
        const components = await asset.collectPageDependJson(asset)
        // return components
        return collectComponents(components)
      }

      const current = allPagePaths[key]
      const js = current['js']
      const json = current['json']
      if (json) {
        return {
          path: key,
          realPath: json.distPath,
          methods: await processJs(js.distPath),
          components: await processJson(json.distPath)
        }
      }
      return {
        path: key,
        realPath: '',
        methods: [],
        components: []
      }
    }))

    console.log(`扫描结果在：${chalk.green(path.resolve('./res.json'))}`)
    fs.writeFileSync('./res.json', JSON.stringify(ast, null, 2))
  }

  // 扫描app.json下的page页面，返回page数组
  async _scanAppJson() {
    this.entryFiles = this.normalizeEntryFiles();
    const jsonFile = this.entryFiles.filter(item => new RegExp(/\.json$/).test(item))
    let jsonAsset: any = null
    console.log('引用的入口文件：', jsonFile)
    for (const entry of new Set(jsonFile)) {
      jsonAsset = await this.resolveAsset(entry);
    }
    // 获取当前资源的依赖
    await jsonAsset.getDependencies()
    // 收集pageJson
    return await jsonAsset.collectAppDependJson(jsonAsset)
  }

  async init() {
    await this.compiler.init(this.resolver);
  }

  async resolveAsset(name: string, parent?: string) {
    const {path} = await this.resolver.resolve(name, parent);

    return this.getLoadedAsset(path);
  }

  getLoadedAsset(path: string) {
    if (this.loadedAssets.has(path)) {
      return this.loadedAssets.get(path);
    }

    const asset = this.compiler.getAsset(path);
    if (this.loadedAssets.has(asset.name)) {
      return this.loadedAssets.get(asset.name);
    }

    this.loadedAssets.set(path, asset);
    this.loadedAssets.set(asset.name, asset);

    // this.watch(path, asset);
    return asset;
  }
}

export default async function scan(
  program: any
) {
  const config = await getJGBConfig();
  const core = new Core(
    Object.assign(
      {
        cache: true
      },
      config,
      {
        rootDir: program.source
      }
    )
  );

  await core.scan()
}