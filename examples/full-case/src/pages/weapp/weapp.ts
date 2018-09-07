import { JPage } from 'jgb-weapp';

JPage({
  onShareAppMessage() {
    return {
      title: '自定义转发标题',
      path: '/page/index/index?id=123'
    };
  },
  data: {
    weapp: 'test'
  },
  onLoad() {
    console.log('onload', this);
    this.onShareAppMessage = () => ({
      title: '改-自定义转发标题',
      path: '/page/index/index?id=123'
    });
    setTimeout(() => {
      this.$router.push('/pages/index/index');
    }, 100);

    this.$on('onUnload', () => {
      console.log('weapp-onuload');
    });
  },
  onUnload() {
    this.$emit('onUnload');
  }
});
