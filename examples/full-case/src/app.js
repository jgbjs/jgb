import 'miniapp-regenerator-runtime';
import { JApp, JGB } from 'jgb-weapp'
import './init.js';
import testUtil from './utils/index'
import TestAlias from '@alias/testAlias'
import AliasTest from '@alias-test'
import test from './utils/test.ts'

const isProd = process.env.NODE_ENV === 'production'

JApp({
  async onLaunch() {
    JGB.intercept('getStorageInfo', (result, status, options) => {
      console.info('intercept', status, result, options)
      return result
    })

    const res = await JGB.getStorageInfo()
    console.log('getStorageInfo', res)

    testUtil(2)
    console.log(TestAlias)
    AliasTest();
    test(1)
  }
})
