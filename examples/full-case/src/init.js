import { JPage, JApp } from 'jgb-weapp';

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
