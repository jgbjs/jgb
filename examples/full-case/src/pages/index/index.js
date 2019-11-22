import testUtil from '@/utils/index';
import fly from 'flyio';
import createRecycleContext from 'miniprogram-recycle-view'

Page({
  data: {
    title: 'title - 1121'
  },
  onLoad() {
    testUtil(1);
    console.log('createRecycleContext ', createRecycleContext)
  },
  request() {
    fly.request('https://baidu.com/')
  }
});
