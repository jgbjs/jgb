/* tslint:disable */
import { JComponent } from 'jgb-weapp';

JComponent({
  attached() {
    this.show();
  },
  properties: {
    title: {
      type: String,
      value: '',
      observer(nv: string) {
        this.data;
        this.hide();
      }
    },
    name: String
  },
  data: {
    isShow: false
  },
  methods: {
    show() {
      this.data.asd;
      console.log(this.properties.name);
    },
    hide() {
      this.show();
    }
  }
});
