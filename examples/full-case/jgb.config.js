const Path = require('path')

module.exports = {
  alias: {
    '@/utils': './src/utils',
    "@/src": './src',
    '@alias': './aliasTest',
    '@alias-test': Path.resolve('../alias-test/src/')
  },
  presets: ['weapp']
}
