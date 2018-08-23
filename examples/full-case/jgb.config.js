const Path = require('path')

module.exports = {
  entryFiles: ['app.json'],
  alias: {
    '@/utils': './src/utils',
    "@/src": './src',
    '@alias': './aliasTest',
    '@alias-test': Path.resolve('../alias-test/src/')
  },
  presets: ['weapp'],
  plugins: [['less', {
    extensions: ['.wxss'],
    outExt: '.wxss'
  }]]
}
