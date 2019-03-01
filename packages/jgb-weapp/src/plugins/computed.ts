import { IPlugin } from '../../types/plugins';
import { Compute } from '../compute';

const computedPlugin: IPlugin = {
  install(res) {
    const { JPage, JComponent } = res;
    JPage.intercept(function(opts) {
      const init = Compute(opts);
      const onLoad = opts.onLoad || (() => {});
      opts.onLoad = function(...args: any[]) {
        init(this);
        onLoad.apply(this, args);
      };
      return opts;
    });

    JComponent.intercept(function(opts) {
      const init = Compute(opts);
      const created = opts.created || (() => {});
      opts.created = function(...args: any[]) {
        init(this);
        created.apply(this, args);
      };
      return opts;
    });
  }
};

export default computedPlugin;
