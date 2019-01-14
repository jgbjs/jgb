import testUtil from '@/utils/index';
import fly from 'flyio';

Page({
  data: {
    title: 'title - 1121'
  },
  onLoad() {
    testUtil(1);
    
  },
  request() {
    fly.request('https://baidu.com/')
  }
});
