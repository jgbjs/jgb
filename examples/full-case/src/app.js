import { JApp } from 'jgb-weapp'
import './init.js';
import testUtil from './utils/index'
import TestAlias from '@alias/testAlias'
import AliasTest from '@alias-test'
import test from './utils/test.ts'

JApp({
  onLaunch() {
    testUtil(2)
    console.log(TestAlias)
    AliasTest();
    test(1)
  }
})