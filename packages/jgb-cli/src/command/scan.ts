import * as babel from 'babel-core';
import chalk from 'chalk';
import * as fs from 'fs';
import { pathToUnixType } from 'jgb-shared/lib/utils/index';
import * as json5 from 'json5';
import ora from 'ora';
import * as Path from 'path';

let componentNum = 0

interface ISubPackage {
  root: string,
  pages: string[]
}

interface IAppJson {
  pages: string[],
  subPackages: ISubPackage[]
}

interface ICore {
  entry: string
}


/**
 * 判断被babel劫持到的ObjectExpression向上查找是否是某个对象的一个属性中的属性 例如: obj = {a: {func: () => {}}},
 * func是a对象的一个ObjectProperty属性，但a是obj的一个属性，则返回ObjectProperty。直到找到的是program
 * @param path type为ObjectExpression
 */
const recentTypeIsObjOrProgram = (path: any): ('ObjectProperty' | 'Program') => {
  let type: ('ObjectProperty' | 'Program') = 'Program'
  let node = path.parentPath
  while (!babel.types.isProgram(node.node)) {
    if (babel.types.isObjectExpression(node)) {
      type = 'ObjectProperty'
      break;
    }
    node = node.parentPath
  }
  return type
}

/**
 * 收集页面参数
 */
interface ICollectPageParam {
  /**
   * 页面路径
   * @example `/pages/home/home`
   */
  path: string;
  /**
   * 页面标题 page.json 中的 "navigationBarTitleText"
   * @example `"途虎养车"`
   */
  title: string;
  /**
   * 页面所需参数options, page.json 中的 "$pageParams"
   * @example
   * ```js
   *  {
   *    "url": {
   *      "isRequired": true,
   *      "comment": "web地址",
   *      "example": "https://wx.tuhu.cn/vue/vueTest/pages/kawash/mdlist?_project=wx"
   *    }
   *  }
   * ```
   */
  params: IPageJsonParam;
}

interface IPageJsonParam {
  /**
   * 参数是否必需
   */
  isRequired: boolean;
  /**
   * 参数意义备注
   */
  comment: string;
  /**
   * 参数示例
   */
  example: string;
}

const isParentPathProgramNode = (path: any, step: number): boolean => {
  let node = path
  for (let i = 0; i < step; i++) {
    node = node.parentPath
  }
  return babel.types.isProgram(node.node)
}

const getNodeName = (node: any): string => node.name

const formatPath = (path: string, replacedStr: string): string => pathToUnixType(Path.relative(replacedStr, path))

class Core {
  entry: string
  pathes: string[]
  errPath: any[]

  constructor(options: ICore) {
    this.errPath = []
    this.entry = options.entry
  }

  async scan(scanPageParams = false) {
    if (scanPageParams) {
      return this.scanPageParams();
    }
    const spinner = ora();
    try {
      spinner.start(chalk.green('start scanning'))
      const data = await this._getAppJson(this.entry)
      if (!data) {
        return console.log(chalk.red('文件内容为空'))
      }
      const mainPackages = data.pages
      const subPackages = this._getSubPackagesPath(data.subPackages)
      this.pathes = this._mergePath(mainPackages, subPackages)
      const res = await this._startScanPage()
      spinner.stop()
      this._printErrorInfo()
      fs.writeFile(Path.resolve(this.entry, '../scan-res.json'), JSON.stringify(res, null, 2), (err: any) => {
        if (err) {
          return console.log(chalk.red('文件写入失败'))
        }
        console.log(chalk.greenBright(`文件写入至: ${ Path.resolve(this.entry, '../scan-res.json') }`))
        console.log(chalk.greenBright(`共${ chalk.blueBright(`${ this.pathes.length }`) }个页面, ${ chalk.blueBright(`${ componentNum }`) }个组件,去除${ chalk.blueBright(`${ subPackages.length + mainPackages.length - this.pathes.length }`) }个多余页面`))
      })
    } catch (e) {
      console.log('e', e)
    }
  }

  /**
   * 扫描收集 page.json 中的 $pageParams 页面参数
   */
  async scanPageParams() {
    const spinner = ora();
    try {
      spinner.start(chalk.green('start scanning'))
      const data = await this._getAppJson(this.entry)
      if (!data) {
        spinner.stop();
        return console.log(chalk.red('文件内容为空'))
      }
      const mainPackages = data.pages
      const subPackages = this._getSubPackagesPath(data.subPackages)
      const paths = this._mergePath(mainPackages, subPackages)
      const res = await this._collectPages(paths);
      spinner.stop();
      const resFilename = 'scan-page-params.json';
      const absoluteResFile = Path.resolve(this.entry, '..', resFilename);
      fs.writeFile(absoluteResFile, JSON.stringify(res, null, 2), (err) => {
        if (err) {
          return console.log(chalk.red('文件写入失败'))
        }
        console.log(chalk.greenBright(`文件写入至: ${ absoluteResFile }`))

        console.log(chalk.greenBright(`共${ chalk.blueBright(`${ paths.length }`) }个页面, ,去除${ chalk.blueBright(`${ subPackages.length + mainPackages.length - paths.length }`) }个多余页面`))
      })
    } catch (e) {
      spinner.stop();
      console.log(e);
    }
  }

  _printErrorInfo() {
    if (this.errPath.length) {
      console.log(chalk.redBright('以下路径未被find: '))
      console.log(chalk.redBright(JSON.stringify(this.errPath, null, 2)))
    }
  }

  async _startScanPage() {
    const res: any[] = []
    for (const path of this.pathes) {
      const obj: any = {}
      obj.path = path
      obj.methods = await this._getMethods(path) || []
      obj.components = await this._getComponents(path) || []
      obj.type = 'page'
      res.push(obj)
    }
    return res
  }

  _getAppJson(entry: string): Promise<IAppJson> {
    return new Promise((resolve, reject) => {
      fs.readdir(entry, (err: any) => {
        if (err) {
          console.log(chalk.red('\n未发现dist目录'))
          return reject(null)
        }
        fs.readFile(Path.resolve(entry, 'app.json'), 'utf8', (error: any, data: any) => {
          if (error) {
            console.log(chalk.red('未发现app.json文件'))
            return reject(null)
          }
          return resolve(json5.parse(data))
        })
      })
    })
  }

  _getComponents(path: string) {
    return new Promise((resolve, reject) => {
      const entry = Path.resolve(this.entry, `${ path }.json`)
      const res: any[] = []
      fs.readFile(entry, 'utf8', (async (err: any, data: any) => {
        if (err) {
          console.log(chalk.red(`\n未找到json文件: ${ entry }`))
          return resolve(null)
        }
        data = json5.parse(data)
        const usingComponents = data.usingComponents || {}
        // tslint:disable-next-line: forin
        for (const componentName in usingComponents) {
          componentNum++
          const componentPath: string = usingComponents[componentName]
          // 去除组件路径为plugins的
          if (componentPath.startsWith('plugin:')) {
            continue
          }
          const obj: any = {}
          const absCompPath = Path.resolve(entry, '../', this._normalizePath(componentPath))
          // console.log('this.entry', this.entry, _path)
          obj.path = formatPath(absCompPath, `${ this.entry }`)
          obj.methods = await this._getMethods(absCompPath, formatPath(path, `${ this.entry }/`)) || []
          obj.type = 'component'
          obj.components = await this._getComponents(absCompPath) || []
          res.push(obj)
        }
        return resolve(res)
      }))
    })
  }


// 获取分包的路径，返回绝对路径
  _getSubPackagesPath(subPackages: ISubPackage[]) {
    if (!subPackages?.length) {
      return [];
    }
    return subPackages.reduce((pre, subPackage) => {
      const root = subPackage.root
      return pre.concat(subPackage.pages.map((path) => `${ root }/${ path }`))
    }, [])
  }

// 合并路径，去除重复的路径, 并去除plugin
  _mergePath(mainPackages: string[], subPackages: string[]) {
    mainPackages = mainPackages || []
    subPackages = subPackages || []
    const res: string[] = []
    for (const path of mainPackages) {
      // let isExist = false
      // for (const sub of subPackages) {
      //   if (sub.includes(path)) {
      //     isExist = true
      //     break
      //   }
      // }
      // if (!isExist) {
      //   res.push(path)
      // }
      res.push(path)
    }
    return res.concat(subPackages)
  }

  _getMethods(filePath: string, parentPath?: string) {
    return new Promise((resolve, reject) => {
      const entry = Path.resolve(this.entry, `${ filePath }.js`)
      fs.readFile(entry, 'utf8', (err: any, code: any) => {
        if (err) {
          this.errPath.push({
            [`${ parentPath }`]: filePath
          })
          return resolve(null)
        }
        const ast = babel.transform(code, {
          sourceType: 'module'
        }).ast;
        const funcNames: string[] = [];
        babel.traverse(ast, {
          ObjectProperty: (path: any, state: any) => {
            const node: any = path.node;
            const { key, value }: any = node;
            // 移除computed里面的方法
            if (key.name === 'computed') {
              value.properties.forEach((property: any) => {
                property.filter = true;
              });
            }
            if (recentTypeIsObjOrProgram(path.parentPath) === 'Program' &&
              !node.filter && // 不是computed属性
              key.name !== 'observer' // 不是observer
            ) {
              // func: function func() {}
              if (babel.types.isFunctionExpression(value)) {
                funcNames.push(getNodeName(key));
              }
              // func: function() { return function () {} }()
              if (babel.types.isCallExpression(value)) {
                if (babel.types.isFunctionExpression(value.callee)) {
                  funcNames.push(getNodeName(key));
                }
              }
            }
            if (key.name === 'methods') {
              const methods = value.properties
                && Array.isArray(value.properties)
                && value.properties.map((item: any) => item.key.name) || []
              funcNames.push(...methods)
            }
          },
          AssignmentExpression: (path: any, state: any) => {
            const { node }: any = path;
            const { left }: any = node;
            if (babel.types.isMemberExpression(left)) {
              const { object, property }: any = left;
              if (
                object &&
                object.property &&
                babel.types.isIdentifier(object.property) &&
                object.property.name === 'prototype'
              ) {
                if (
                  left.property &&
                  babel.types.isIdentifier(left.property)
                ) {
                  funcNames.push(getNodeName(left.property));
                }
              }
            }
          }
        });
        return resolve(funcNames)
      })
    })
  }

  // 针对 /component/index/index  ==>  /path/to/component/index/index
  _normalizePath(path: string) {
    path = path.replace(/\\/g, '/')
    if (path.substr(0, 1) === '/') {
      path = `${ this.entry }/${ path.substr(1) }`
    }
    return path
  }

  /**
   * 收集全部页面参数
   * @param {string[]} paths 所有要收集的页面路径
   */
  private async _collectPages(paths: string[]) {
    const res: ICollectPageParam[] = [];
    for (const path of paths) {
      const collectedJson = await this._collectPageParams(path);
      if (collectedJson) {
        res.push(collectedJson);
      }
    }
    return res;
  }

  /**
   * 收集页面参数
   * @param {string} path 页面路径
   */
  private async _collectPageParams(path: string) {
    return new Promise<ICollectPageParam | null>((resolve, reject) => {
      const pageJsonPath = Path.resolve(this.entry, `${ path }.json`);
      fs.readFile(pageJsonPath, 'utf8', (err, data) => {
        if (err) {
          console.log(pageJsonPath, err);
          resolve(null);
          return;
        }

        try {
          const json = json5.parse(data);
          const pageParams = json.$pageParams || null;
          const pageTitle = json.navigationBarTitleText || '';
          resolve({
            path,
            title: pageTitle,
            params: pageParams,
          });
        } catch (e) {
          console.log(pageJsonPath, e);
          resolve(null);
        }
      })
    })
  }
}

export default async function scan(program: any) {
  const path = program.source || process.cwd();
  let entry = Path.resolve(path, 'dist');
  const { pageParams } = program;
  // 有 pageParams 参数时，需要扫描原始文件
  if (pageParams) {
    entry = Path.resolve(path, 'src');
  }
  const core = new Core({
    entry
  })
  await core.scan(pageParams)
}
