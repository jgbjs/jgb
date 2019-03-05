# JGB （金箍棒）

小程序渐进式增强开发工具。[v1文档](./README.v1.md)

## 使用

```shell
# 全局安装 @jgbjs/cli
npm i -g @jgbjs/cli # yarn add global @jgbjs/cli
```

相关根目录配置文件**jgb.config.js**

```js
module.exports = {
  // 支持js文件 alias
  alias: {
    '@/utils': './src/utils'
  },
  // 简写参考 https://babeljs.io/docs/en/options#name-normalization
  // @jgbjs/plugin-less 简写 less
  plugins: ['@jgbjs/less'],
  // @jgbjs/preset-weapp 简写 weapp
  presets: ['@jgbjs/weapp']
};
```



## 升级指南

```shell
# 安装jgb 最新版@jgbjs/cli v2.x
jgb --version # 2.x
jgb update # 会更新jgb.config.js 和package.json的依赖
```



## 特性 (具体查看examples)

- 支持alias（默认编译到dist目录中的npm目录）
- 支持npm （默认编译到dist目录中的npm目录）
- 自动分析**app.json**中的引用资源文件以及**pages.json**中的**usingComponents**中的资源文件



## alias

支持script,json等文件的alias, 配置：

```js
module.exports = {
    alias: {
        // object 类型
        '@keyboard': {
            // alias 路径
            path: './node_modules/miniapp-keyboard',
            // 指定需要编译到的dist目录， 默认npm
            dist: 'pages/component/'
        },
        // string 类型相当于 object.path
        '@/utils': './src/utils'
    }
}
```





## plugins

关于插件配置：

	所有小程序插件均以支持编译文件类型的形式存在,具体详见各个插件。

默认插件支持配置 **jgb.config.js**

```js
module.exports = {
    plugins: ['@jgbjs/babel', {
        // 支持babel编译的文件扩展名
        extensions: ['.js'],
        // 需要输出的文件扩展名
        outExt: '.js'
    }]
}
```

- [@jgbjs/plugin-babel](packages/jgb-plugin-babel/README.md)
- [@jgbjs/plugin-css](packages/jgb-plugin-css/README.md)
- [@jgbjs/plugin-html](packages/jgb-plugin-html/README.md)
- [@jgbjs/plugin-json](packages/jgb-plugin-json/README.md)
- [@jgbjs/plugin-less](packages/jgb-plugin-less/README.md)
- [@jgbjs/plugin-typescript](packages/jgb-plugin-typescript/README.md)

## presets

- @jgbjs/preset-weapp (微信小程序)

- @jgbjs/preset-aliapp (支付宝小程序)

## Roadmap

- [x] 支持微信小程序编译 (@jgbjs/preset-weapp)

- [x] 支持支付宝小程序编译 (@jgbjs/preset-aliapp)

- [x] 支持百度小程序编译

- [x] 支持微信小程序usingComponents使用npm中的组件

- [x] 支持 typescript 编译

- [x] 支持 less 编译

- [ ] 支持 sass/scss 编译

## 参考项目

- [parcel](https://github.com/parcel-bundler/parcel)
- [taro](https://github.com/NervJS/taro)
- [wepy](https://github.com/Tencent/wepy)
