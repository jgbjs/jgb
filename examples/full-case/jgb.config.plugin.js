const Path = require('path')

module.exports = {
  entryFiles: ['plugin.json'],
  sourceDir: 'plugin',
  cache: false,
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
