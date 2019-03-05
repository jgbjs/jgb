// @ts-ignore
import AliasTest from '@alias-test';
// @ts-ignore
import TestAlias from '@alias/testAlias.js';
import { JApp, JComponent, jgb } from '@jgbjs/weapp';
import 'miniapp-regenerator-runtime';
import './init.js';
import testUtil from './utils/index';
import test from './utils/test';

// @ts-ignore
const isProd = process.env.NODE_ENV === 'production';

JComponent.intercept(opts => {
  console.log('JComponent.intercept', opts);
  return opts;
});

JApp({
  globaldata: {},
  async onLaunch() {
    jgb.intercept('getStorageInfo', (result, status, options) => {
      console.info('intercept', status, result, options);
      return result;
    });
    console.log(this.globaldata);
    const res = await jgb.getStorageInfo();
    console.log('getStorageInfo', res);

    testUtil(2);
    console.log(TestAlias);
    AliasTest();
    test('1');
  }
});
