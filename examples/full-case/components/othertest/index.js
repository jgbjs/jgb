import { JComponent } from 'jgb-weapp';

JComponent({
  pageLifetimes: {
    show() {
      console.log(`Component show`, this)
    },
    hide() {
      console.log(`Component hide`)
    }
  },
  created() {
    console.log(`Component created`, this)
  },
  attached() {
    console.log(`Component attached`)
  },
  ready() {
    console.log(`Component ready`)
  },
  test() {
    console.log(`invoke test`)
  },
  /**
   * 组件的属性列表
   */
  properties: {

  },

  /**
   * 组件的初始数据
   */
  data: {

  },

  /**
   * 组件的方法列表
   */
  methods: {
    func() {
      console.log(`func`)
    }
  }
})
