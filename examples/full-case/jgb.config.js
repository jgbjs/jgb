const Path = require('path')

module.exports = {
  // entryFiles: ['pages/index/index.js'],
  // entryFiles: ['assets/index.wxss'],
  // entryFiles: ['app.ts', 'app.wxss', 'app.json'],
  // entryFiles: ['testAlias.ts'],
  cache: false,
  alias: {
    '@/components': './src/components',
    '@components': './components/',
    'flyio': './node_modules/flyio/dist/npm/wx.js',
    // 'lodash': 'lodash-es',
    '@/utils': './src/utils',
    "@/src": './src',
    // '@alias': './aliasTest',
    '@alias-test': Path.resolve('../alias-test/src/'),
    '@navbar': {
      path: './node_modules/miniprogram-navigation-bar',
      dist: 'pages/aliasComponent/'
    }
  },
  presets: ['weapp'],
  plugins: [['less', {
    extensions: ['.wxss'],
    outExt: '.wxss'
  }],
    'typescript',
  ['wxs', {
    extensions: ['.wxs'],
    outExt: '.wxs'
  }]]
}
