import {pathToUnixType} from 'jgb-shared/lib/utils/index';
const ora = require('ora');
const babel = require('babel-core')
const Path = require('path')
const fs = require('fs')
const chalk = require('chalk')
const json5 = require('json5')

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

  async scan() {
    const spinner = ora();
    try {
      spinner.start(chalk.green('start scanning'))
      const data = await this._getAppJson(this.entry)
      if (!data) { return console.log(chalk.red('文件内容为空')) }
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
        console.log(chalk.greenBright(`文件写入至: ${Path.resolve(this.entry, '../scan-res.json')}`))
        console.log(chalk.greenBright(`共${chalk.blueBright(this.pathes.length)}个页面, ${chalk.blueBright(componentNum)}个组件,去除${chalk.blueBright(subPackages.length + mainPackages.length - this.pathes.length)}个多余页面`))
      })
    } catch (e) {
      console.log('e', e)
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
          console.log(chalk.red('未发现dist目录'))
          return reject(null)
        }
        fs.readFile(Path.resolve(entry, 'app.json'), 'utf8', (err: any, data: any) => {
          if (err) {
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
          console.log(chalk.red(`未找到json文件: ${ entry }`))
          return resolve(null)
        }
        data = json5.parse(data)
        const usingComponents = data.usingComponents || {}
        // tslint:disable-next-line: forin
        for (const componentName in usingComponents) {
          componentNum++
          const componentPath: string = usingComponents[componentName]
          // 去除组件路径为plugins的
          if (componentPath.startsWith('plugin:')) { continue }
          const obj: any = {}
          const _path = Path.resolve(entry, '../', this._normalizePath(componentPath))
          // console.log('this.entry', this.entry, _path)
          obj.path = formatPath(_path, `${ this.entry }`)
          obj.methods = await this._getMethods(_path, formatPath(path, `${this.entry}/`)) || []
          obj.type = 'component'
          obj.components = await this._getComponents(_path) || []
          res.push(obj)
        }
        return resolve(res)
      }))
    })
  }


// 获取分包的路径，返回绝对路径
  _getSubPackagesPath(subPackages: ISubPackage[]) {
    return subPackages.reduce((pre, subPackage) => {
      const root = subPackage.root
      return pre.concat(subPackage.pages.map((_path) => `${ root }/${ _path }`))
    }, [])
  }

// 合并路径，去除重复的路径, 并去除plugin
  _mergePath(mainPackages: string[], subPackages: string[]) {
    mainPackages = mainPackages || []
    subPackages = subPackages || []
    const res: string[] = []
    for (const path of mainPackages) {
      let isExist = false
      for (const sub of subPackages) {
        if (sub.includes(path)) {
          isExist = true
          break
        }
      }
      if (!isExist) {
        res.push(path)
      }
    }
    return res.concat(subPackages)
  }

  _getMethods(filePath: string, parentPath?: string) {
    return new Promise((resolve, reject) => {
      const entry = Path.resolve(this.entry, `${ filePath }.js`)
      fs.readFile(entry, 'utf8', (err: any, code: any) => {
        if (err) {
          this.errPath.push({
            [`${parentPath}`]: filePath
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
            if (
              babel.types.isFunctionExpression(value) &&
              isParentPathProgramNode(path, 4) &&
              !node.filter && // 不是computed属性
              key.name !== 'observer' // 不是observer
            ) {
              funcNames.push(getNodeName(key));
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
}

export default async function scan(program: any) {
  const _path = program.source || process.cwd()
  const entry = Path.resolve(_path, 'dist')
  const core = new Core({
    entry
  })
  await core.scan()
}

