import { JPage, JApp, JGB, use } from 'jgb-weapp';
import Plugins from 'jgb-weapp/lib/plugins'

use(Plugins.RouterPlugin);
use(Plugins.NativeApiPlugin)

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