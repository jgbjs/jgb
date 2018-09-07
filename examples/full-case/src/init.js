import { JPage, JApp, JGB, use } from 'jgb-weapp';
import Plugins from 'jgb-weapp/lib/plugins'

use(Plugins.RouterPlugin);
use(Plugins.NativeApiPlugin)

JGB.intercept('getStorageInfo', (res, status) => {
  console.log('intercept success', res, status)
  return res
})

JGB.getStorageInfo({
  success(res) {
    console.log('getStorageInfo', res)
  }
})

JApp.mixin({
  onLaunch(e) {
    console.log('mixin onLaunch')
  }
})


JPage.mixin({
  onLoad(e) {
    console.log('mixin page load', e);
  }
});

JPage.intercept('onShareAppMessage', data => {
  console.log('intercept onShareAppMessage', data);
  return data;
});