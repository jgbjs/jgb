# JGB （金箍棒）

---

<img src="https://api.travis-ci.com/jgbjs/jgb.svg?branch=1.x">

小程序渐进式增强开发工具。

## 使用

```shell
# 全局安装jgb-cli
npm i -g jgb-cli
```

相关根目录配置文件**jgb.config.js**

```js
module.exports = {
  // 支持js文件 alias
  alias: {
    '@/utils': './src/utils',
  },
  // jgb-preset-weapp 简写 less
  plugins: ['less'],
  // jgb-preset-weapp 简写 weapp
  presets: ['weapp'],
};
```

## 特性 (具体查看 examples)

- 支持 alias（默认编译到 dist 目录中的 npm 目录）
- 支持 npm （默认编译到 dist 目录中的 npm 目录）
- 自动分析**app.json**中的引用资源文件以及**pages.json**中的**usingComponents**中的资源文件

## alias

支持 script,json 等文件的 alias, 配置：

```js
module.exports = {
  alias: {
    // object 类型
    '@keyboard': {
      // alias 路径
      path: './node_modules/miniapp-keyboard',
      // 指定需要编译到的dist目录， 默认npm
      dist: 'pages/component/',
    },
    // string 类型相当于 object.path
    '@/utils': './src/utils',
  },
};
```

## plugins

关于插件配置：

    所有小程序插件均以支持编译文件类型的形式存在,具体详见各个插件。

默认插件支持配置 **jgb.config.js**

```js
module.exports = {
  plugins: [
    'babel',
    {
      // 支持babel编译的文件扩展名
      extensions: ['.js'],
      // 需要输出的文件扩展名
      outExt: '.js',
    },
    [
      'css',
      {
        // 需要输出的文件扩展名
        outExt: '.wxss',
        // 使用 glob 匹配文件
        // 默认以 extension 匹配文件
        glob: '**/color/*.css',
      },
    ],
  ],
};
```

- [jgb-plugin-babel](packages/jgb-plugin-babel/README.md)
- [jgb-plugin-css](packages/jgb-plugin-css/README.md)
- [jgb-plugin-html](packages/jgb-plugin-html/README.md)
- [jgb-plugin-json](packages/jgb-plugin-json/README.md)
- [jgb-plugin-less](packages/jgb-plugin-less/README.md)
- [jgb-plugin-typescript](packages/jgb-plugin-typescript/README.md)

## presets

- jgb-preset-weapp (微信小程序)

- jgb-preset-aliapp (支付宝小程序)

## Roadmap

- [x] 支持微信小程序编译 (jgb-preset-weapp)

- [x] 支持支付宝小程序编译 (jgb-preset-aliapp)

- [x] 支持百度小程序编译

- [x] 支持微信小程序 usingComponents 使用 npm 中的组件

- [x] 支持 typescript 编译

- [x] 支持 less 编译

- [ ] 支持 sass/scss 编译

## 参考项目

- [parcel](https://github.com/parcel-bundler/parcel)
- [taro](https://github.com/NervJS/taro)
- [wepy](https://github.com/Tencent/wepy)
