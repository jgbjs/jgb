
const systemInfo = wx.getSystemInfoSync()

App({
  onLaunch() {
    wx.getStorage({
      key: 'test',
      success(res) {
        console.log(res.data)
      }
    })
  }
})
