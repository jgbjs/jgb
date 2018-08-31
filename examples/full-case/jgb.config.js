const Path = require('path')

module.exports = {
  // entryFiles: ['utils/index.js'],
  // entryFiles: ['pages/index/index.wxss'],
  alias: {
    '@/components': './src/components',
    '@/utils': './src/utils',
    "@/src": './src',
    '@alias': './aliasTest',
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
  }], 'typescript']
}
