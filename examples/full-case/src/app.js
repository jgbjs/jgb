import testUtil from './utils/index'
import TestAlias from '@alias/testAlias'
import AliasTest from '@alias-test'

App({
  onLaunch() {
    testUtil(2)
    console.log(TestAlias)
    AliasTest();
  }
})