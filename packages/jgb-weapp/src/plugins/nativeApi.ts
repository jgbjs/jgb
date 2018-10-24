import { IPlugin } from '../../types/plugins';
import initNativeApi from '../native-api/index';
const nativeApiPlugin: IPlugin = {
  install(res) {
    const { jgb } = res;
    initNativeApi(jgb);
  }
};

export default nativeApiPlugin;
