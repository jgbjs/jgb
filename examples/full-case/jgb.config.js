const Path = require('path')

module.exports = {
  alias: {
    '@/components': './src/components',
    '@/utils': './src/utils',
    "@/src": './src',
    '@alias': './aliasTest',
    '@alias-test': Path.resolve('../alias-test/src/')
  },
  presets: ['weapp'],
  plugins: [['less', {
    extensions: ['.wxss'],
    outExt: '.wxss'
  }], 'typescript']
}
