const Path = require('path')

module.exports = {
  // entryFiles: ['app.js'],
  // entryFiles: ['pages/weapp/weapp.ts'],
  alias: {
    '@/components': './src/components',
    // 'lodash': 'lodash-es',
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
