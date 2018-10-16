
module.exports = {
  cache: false,
  presets: ['weapp'],
  plugins: [['css', {
    outExt: '.css',
    extensions: ['.wxss'],
  }], ['html', {
    extensions: ['.wxml'],
    outExt: '.swan'
  }]]
}
