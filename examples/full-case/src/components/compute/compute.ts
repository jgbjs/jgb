import { JComponent } from 'jgb-weapp';

JComponent({
  computed: {
    d(): string {
      return this.properties.a + this.properties.b + this.properties.c;
    }
  },
  properties: {
    a: String,
    b: {
      type: Number,
      value: 1
    },
    c: {
      type: Number
    }
  },
  methods: {
    test() {
      console.log(this.data.d)
    }
  }
});
