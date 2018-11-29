import { JComponent } from "jgb-weapp";

JComponent({
  attached() {},
  properties: {
    title: {
      type: String,
      value: ""
    },
    name: String
  },
  data: {
    isShow: false
  },
  methods: {
    show() {
      this.properties.name;
    },
    hide() {}
  }
});
