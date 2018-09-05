import { JPage, JApp, Plugins ,use } from 'jgb-weapp';

use(Plugins.RouterPlugin);

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