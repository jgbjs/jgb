import { Accessors, DefaultData } from './common';
import { IEventFunction, INewEventBus } from './eventbus';
import { Router } from './router';

type DefaultComputed = { [key: string]: any };

interface IPageOptions<
  P extends JPage = JPage,
  Data = DefaultData<P>,
  Computed = DefaultComputed
> extends Page.PageInstance<Data> {
  /**
   * 计算属性, 类似Vue
   * 需要指定方法的类型
   * @example
``` js
 {
   computed: {
     priceWithCurrency():string {
        return '$' + this.data.price
     }
   }
 }
```
   */
  computed?: Accessors<Computed>;
}

export interface JPage
  extends Required<Pick<Page.PageInstanceBaseProps, 'setData' | 'route'>>,
    INewEventBus {
  readonly $route: {
    path: string;
    params: any;
    query: any;
    hash: '';
    fullPath: string;
    name: string;
  };
  readonly $router: typeof Router;
  /**
   * @deprecated 请使用route但须考虑兼容
   */
  __route__: string;
  /**
   * 滚动到指定元素
   * @param selector 元素selector
   * @param ctx ctx作用域默认是当前页面
   */
  $scrollIntoView(selector: string, ctx?: any): Promise<any>;
}

type CombinedPageInstance<Instance extends JPage, Data, Method, Computed> = {
  data: Data & Computed;
} & Instance &
  Method &
  IAnyObject;

type ThisTypedPageOptionsWithArrayProps<
  P extends JPage,
  Data extends Record<string, any>,
  Method,
  Computed
> = IPageOptions<P, Data, Computed> &
  Method &
  ThisType<CombinedPageInstance<P, Data, Method, Computed>>;

interface IJPageConstructor<P extends JPage = JPage> {
  <Data = Record<string, any>, Method = object, Computed = object>(
    opts: ThisTypedPageOptionsWithArrayProps<P, Data, Method, Computed>
  ): void;
  /**
   * Mixin
   * @param obj
   * @example
   *  JPage.mixin({
   *    onLoad() {
   *      // do something
   *    }
   *  })
   */
  mixin(obj: any): void;
  /**
   * 拦截Page某个方法，除了onLoad
   * @example
   *  JPage.intercept('onShow', () => {})
   */
  intercept(event: string, fn: IEventFunction): void;
  /**
   * 拦截整个Page的参数
   * @example
   *  JPage.intercept(function(opts){
   *    opts.onLoad = () => {}
   *    return opts;
   *  })
   */
  intercept(fn: IEventFunction): void;
}

export var JPage: IJPageConstructor;
