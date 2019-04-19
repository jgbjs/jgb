import { JComponent } from 'jgb-weapp';

JComponent({
  computed: {
    d(): string {
      return this.properties.a + this.properties.b + this.properties.c;
    },
    f(): string {
      return this.data.d + this.data.e;
    },
    e(): string {
      return this.data.d + 2;
    }
  },
  properties: {
    a: String,
    b: {
      type: Number,
      value: 1
    },
    c: {
      type: Number,
      observer() {
        this.test();
      }
    }
  },
  methods: {
    test() {
      console.log(this.data.d);
      console.log(this.data.f);
      console.log(this.data.e);
    }
  }
});
