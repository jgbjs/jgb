var uploadImage = require('free-upload-image')

module.exports = {
  plugins: [
    require('postcss-lazysprite-miniprogram')({
      imagePath:'./src/imgs',
			stylesheetInput: './src/',
			stylesheetRelative: './dist/css',
			spritePath: './dist/slice',
      nameSpace: 'icon-',
      usePseudoBefore: true,
      upload(localfilepath) {
        return uploadImage(localfilepath)
      }
    })
  ]
}
