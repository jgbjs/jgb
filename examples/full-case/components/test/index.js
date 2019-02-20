import { JComponent } from 'jgb-weapp';
JComponent({
  data: {
    data: 1
  },
  attached() {
    console.log(`test component attached`)
    this.setData({
      data: 2
    })
  }
})
