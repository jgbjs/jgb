
module.exports = {
  cache: false,
  presets: ['weapp'],
  plugins: [['css', {
    outExt: '.css',
    extensions: ['.wxss', 'bcss'],
  }], 
  ['html', {
    extensions: ['.wxml', 'swan'],
    outExt: '.swan'
  }],
  ['wxs', {
    extensions: ['.wxs'],
    outExt: '.sjs'
  }]]
}
