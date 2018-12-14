import { JPage } from "jgb-weapp";

JPage({
  onShareAppMessage() {
    return {
      title: "自定义转发标题",
      path: "/page/index/index?id=123"
    };
  },
  data: {
    weapp: "test"
  },
  onScroll() {
    console.log(this);
  },
  onLoad(opts) {
    console.log("onload", this);
    setTimeout(() => {
      this.onShareAppMessage = () => ({
        title: "改-自定义转发标题",
        path: "/page/index/index?id=123"
      });
    }, 100);

    // setTimeout(() => {
    //   this.$router.push('/pages/index/index');
    // }, 100);

    this.$on("onUnload", () => {
      console.log("weapp-onuload");
    });
  },
  onUnload() {
    this.$emit("onUnload");
  }
});
