import { IEventFunction } from './EventBus';
import JBase from './JBase';
import { Mixin } from './Utils';

const mixins = new Map<string, IEventFunction[]>();

export interface IJPageOptions {
  [key: string]: any;

  data?: {
    [key: string]: any;
  };

  onLoad(options: any): void;
}

export default class JPage extends JBase {
  constructor(opts?: IJPageOptions) {
    super();
    if (!(this instanceof JPage)) {
      return new JPage(Mixin(opts, mixins));
    }
  }

  static mixin(fnName: string, fn: IEventFunction) {
    const events = mixins.get(fnName) || [];
    events.push(fn);
    mixins.set(fnName, events);
  }
}

const page = new JPage({
  data:{},
  onLoad() {
    // tslint:disable-next-line:no-unused-expression
    this.data;
  }
})