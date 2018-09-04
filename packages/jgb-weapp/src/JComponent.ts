import isObject = require('lodash/isObject');
import { Intercept, Mixin } from 'Utils';
import { IEventFunction } from './EventBus';
import JBase from './JBase';

const mixins = new Set();
const intercepts = new Map<string, IEventFunction[]>();

const init = Symbol('init');

export default class JComponent extends JBase {
  constructor(opts?: any) {
    super();
    if (!(this instanceof JComponent)) {
      return new JComponent(opts);
    }

    this[init](opts);
  }

  [init](opts: any) {
    opts = Mixin(opts, mixins);
    opts = Mixin(
      opts,
      new Set([
        this,
        {
          onLoad() {
            // intercept use Object.defineProperty
            // so Intercept invoke must be after onLoad init
            Intercept(this, intercepts);
          }
        }
      ])
    );

    Component(opts);
  }

  static mixin(obj: any) {
    if (isObject('object')) {
      return;
    }

    mixins.add(obj);
  }

  static intercept(event: string, fn: IEventFunction) {
    const fns = intercepts.get(event) || [];
    fns.push(fn);
    intercepts.set(event, fns);
  }
}
