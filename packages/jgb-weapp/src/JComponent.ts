import { IEventFunction } from '../types/eventbus';
import JBase, { event } from './JBase';
import expand, { INIT } from './utils/expand';

@expand(Component, 'created')
export default class JComponent {
  static mixin: (obj: any) => void;
  static intercept: (event: string, fn: IEventFunction) => void;
  static [INIT]: (...data: any[]) => void;
  constructor(opts?: any) {
    if (!(this instanceof JComponent)) {
      return new JComponent(opts);
    }

    opts.methods = Object.assign({}, opts.methods, JBase.prototype);

    JComponent[INIT](opts);
  }
}

JComponent.mixin({
  created() {
    this[event] = [];
  },
  detached() {
    this.$destory();
  }
});
