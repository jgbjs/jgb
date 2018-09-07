import JBase from './JBase';
import expand, { INIT } from './utils/expand';
@expand(App, 'onLaunch')
export default class JApp extends JBase {


  static [INIT]: (...data: any[]) => void;
  constructor(opts?: any) {
    super();
    if (!(this instanceof JApp)) {
      return new JApp(opts);
    }

    JApp[INIT](opts);
  }
}
