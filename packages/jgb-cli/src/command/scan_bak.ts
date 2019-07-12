import chalk from 'chalk';
import * as fs from 'fs'
import * as babel from 'babel-core';
import * as path from 'path'
import { getJGBConfig } from '../config';

const code = `
'use strict';

var _jgbWeapp = require('../../npm/jgb-weapp/lib/index.js');

(0, _jgbWeapp.JPage)({
  data: {
    weapp: 'test',
    a: 1,
    b: 2
  },
  computed: {
    weapp1: function weapp1() {
      return this.data.weapp + 1;
    },
    c: function c() {
      return this.data.a + this.data.b;
    }
  },
  onShareAppMessage: function onShareAppMessage() {
    return {
      title: '自定义转发标题',
      path: '/page/index/index?id=123'
    };
  },
  change: function change() {
    console.log(this.data.weapp1);
    this.setData({
      weapp: 'abc'
    });
    this.setData({
      a: this.data.a + 1
    });
  },
  onScroll: function onScroll() {
    console.log(this);
  },
  onLoad: function onLoad(opts) {
    setTimeout(function () {
      _this.onShareAppMessage = function () {
        return {
          title: '改-自定义转发标题',
          path: '/page/index/index?id=123'
        };
      };
    }, 100);
  },
  onUnload: function onUnload() {
    this.$emit('onUnload');
  }
});
`

function getNodeName(node: any): string {
  return node.name
}

function getFuncNames(code: string): string[] {
  const ast = babel.transform(code, {
    sourceType: "module"
  }).ast
  const funcNames: string[] = []
  babel.traverse(ast, {
    ObjectProperty: ({node}) => {
      const {key, value} = node
      if (babel.types.isFunctionExpression(value)) {
        funcNames.push(getNodeName(key))
      }
    },
    AssignmentExpression: ({node}) => {
      const {left, right}: { left: any, right: any } = node
      if (babel.types.isFunctionExpression(right)) {
        funcNames.push(getNodeName(left.property))
      }
    }
  })
  return funcNames
}

// 获取app.json的page信息
function getAppJsonPages(source?: string) {
  return require(path.resolve(`${source}app.json`)).pages
}

// 获取对应page.js文件的字符串
function getJs(path: string) {
  let js: any = null
  try {
    // 先尝试从项目目录读取
    js = fs.readFileSync(path + '.js', 'utf-8')
    return js
  } catch (e) {
    // 再尝试从node_modules读取
    // try {
    //   js = fs.readFileSync(path.)
    // }
    console.log(chalk.red(`Not Found:${path}`))
  }
  return js
}

// 获取对应page的component信息
function getComponents(path: string) {
  let json: any = null
  let componentsPaths: any = null
  try {
    json = require(path + '.json')
    if (json) {
      componentsPaths = json.usingComponents
    }
    return componentsPaths || {}
  } catch (e) {
    console.log(chalk.red(`Not Found: ${path}`))
    return {}
  }
}


export default async function scan(
  program: any
) {
  let source = program.source
  if (!source) {
    source = process.cwd() + '/dist/'
  }
  const pages = getAppJsonPages(source)
  const res: any[] = []

  const run = (realPath: string, page: string) => {
    const dic: any[] = []
    // const currentPath = path.resolve(source, page)
    const jsFile = getJs(realPath)
    const methods = getFuncNames(jsFile)
    const currentComponentsList = getComponents(realPath)
    let components: any[] = []
    if (currentComponentsList) {
      for (let key in currentComponentsList) {
        if (currentComponentsList.hasOwnProperty(key)) {
          let componentPath: string = ''
          let value = currentComponentsList[key]
          const reg = new RegExp(/(^\.{1,2}\/)|(^\/)/)
          if (reg.test(currentComponentsList[key])) {
            componentPath = path.resolve(realPath, '../', value)
          } else {
            // componentPath = path.resolve(process.cwd(), 'node_modules', value, 'lib/component',)
          }
          components.push(run(componentPath, value))
          // const componentPath = path.resolve(realPath, '../', currentComponentsList[key])
          // console.log(path.resolve(jsFile, currentComponentsList[key]))
          // console.log(componentPath)
        }
      }
    }
    dic.push({
      path: page,
      methods,
      components
    })
    return dic
  }

  const _res = pages.map((page: any) => {
    const _path = path.resolve(source, page)
    return run(_path, page)
  })
  getJGBConfig().then(res => {
    console.log(res)
  })
  fs.writeFileSync('./res.json', JSON.stringify(_res, null, 2))
}