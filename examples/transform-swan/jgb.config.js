
module.exports = {
  // entryFiles: ['app.js'],
  cache: false,
  presets: ['weapp'],
  plugins: [['css', {
    outExt: '.css',
    extensions: ['.wxss', 'bcss'],
  }], ['html', {
    extensions: ['.wxml', 'swan'],
    outExt: '.swan'
  }]]
}
