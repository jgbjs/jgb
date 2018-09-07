import { IEventFunction } from './EventBus';
import JBase from './JBase';
import expand, { INIT } from './utils/expand';

@expand(Component, 'created')
export default class JComponent extends JBase {
  static mixin: (obj: any) => void;
  static intercept: (event: string, fn: IEventFunction) => void;
  static [INIT]: (...data: any[]) => void;
  constructor(opts?: any) {
    super();
    if (!(this instanceof JComponent)) {
      return new JComponent(opts);
    }

    JComponent[INIT](opts);
  }
}

JComponent.mixin({
  detached() {
    this.$destory();
  }
});
