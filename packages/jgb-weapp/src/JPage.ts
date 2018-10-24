import { IEventFunction } from '../types/eventbus';
import JBase from './JBase';
import expand, { INIT } from './utils/expand';

@expand(Page, 'onLoad')
export default class JPage extends JBase {
  static mixin: (obj: any) => void;
  static intercept: (event: string, fn: IEventFunction) => void;
  static [INIT]: (...data: any[]) => void;
  constructor(opts?: any) {
    super();
    if (!(this instanceof JPage)) {
      return new JPage(opts);
    }

    JPage[INIT](opts, this);
  }
}

JPage.mixin({
  onUnload() {
    this.$destory();
  }
});
