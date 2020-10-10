// @ts-ignore
import AliasTest from '@alias-test';
import './testAlias';
import { JApp, JComponent, jgb } from 'jgb-weapp';
import 'miniapp-regenerator-runtime';
import './init.js';
import testUtil from './utils/index';
import test from './utils/test';
import './imgs/qa-red.png';
import qagrey from './imgs/qa-grey.png';
import './test';

console.log(qagrey)

// @ts-ignore
const isProd = process.env.NODE_ENV === 'production';
// @ts-ignore
const APP_ENV = process.env.APP_ENV === 'WEIXIN';

JComponent.intercept(opts => {
  console.log('JComponent.intercept', opts);
  opts.methods = Object.assign(
    {
      test() {
        console.log('JComponent.intercept.test');
      }
    },
    opts.methods
  );
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
    AliasTest();
    test('1');
  }
});

// A.?sc[]);
