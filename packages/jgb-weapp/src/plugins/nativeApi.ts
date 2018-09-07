import initNativeApi from '../native-api/index';
const nativeApiPlugin: JGB.IPlugin = {
  install(res) {
    const { JGB } = res;
    initNativeApi(JGB);
  }
};

export default nativeApiPlugin;
