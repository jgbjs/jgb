module.exports = {
  // entryFiles: ['app.js'],
  cache: false,
  presets: ["@jgbjs/weapp"],
  plugins: [["@jgbjs/css", {
    outExt: '.css',
    extensions: ['.wxss', 'bcss']
  }], ["@jgbjs/html", {
    extensions: ['.wxml', 'swan'],
    outExt: '.swan'
  }]]
};
