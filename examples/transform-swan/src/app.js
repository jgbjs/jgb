
App({
  onLaunch() {
    const systemInfo = wx.getSystemInfoSync()

    wx.getStorage({
      key: 'test',
      success(res) {
        console.log(res.data)
      }
    })
  }
})
