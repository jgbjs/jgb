import { JPage } from '@jgbjs/weapp';

JPage({
  data: {
    weapp: 'test',
    a: 1,
    b: 2
  },
  computed: {
    weapp1(): string {
      return this.data.weapp + 1;
    },
    c(): number {
      return this.data.a + this.data.b;
    }
  },
  onShareAppMessage() {
    return {
      title: '自定义转发标题',
      path: '/page/index/index?id=123'
    };
  },

  change() {
    console.log(this.data.weapp1);
    this.setData({
      weapp: 'abc'
    });

    this.setData({
      a: this.data.a + 1
    });
  },

  onScroll() {
    console.log(this);
  },
  onLoad(opts) {
    setTimeout(() => {
      this.onShareAppMessage = () => ({
        title: '改-自定义转发标题',
        path: '/page/index/index?id=123'
      });
    }, 100);

    // setTimeout(() => {
    //   this.$router.push('/pages/index/index');
    // }, 100);

    this.$on('onUnload', () => {
      console.log('weapp-onuload');
    });

    let i = 6;
    const now = Date.now();
    while (i > 0) {
      this.setData(
        {
          weapp: `test${i}`
        },
        () => {
          console.log('usedTime', Date.now() - now);
        }
      );
      i--;
    }
  },
  toSamePage() {
    wx.navigateTo({
      url: `/pages/weapp/weapp?id=2`
    });
  },
  onUnload() {
    this.$emit('onUnload');
  }
});
