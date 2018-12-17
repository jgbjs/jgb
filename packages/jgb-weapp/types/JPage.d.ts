import { DefaultData } from './common';
import { IEventBus, IEventFunction, INewEventBus } from './eventbus';
import { Router } from './router';

interface IPageOptions<P extends JPage = JPage, Data = DefaultData<P>>
  extends Page.PageInstance<Data> {}

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

type CombinedPageInstance<Instance extends JPage, Data, Method> = {
  data: Data;
} & Instance &
  Method &
  IAnyObject;

type ThisTypedPageOptionsWithArrayProps<
  P extends JPage,
  Data extends Record<string, any>,
  Method
> = IPageOptions<P, Data> &
  Method &
  ThisType<CombinedPageInstance<P, Data, Method>>;

interface IJPageConstructor<P extends JPage = JPage> {
  <Data = Record<string, any>, Method = object>(
    opts: ThisTypedPageOptionsWithArrayProps<P, Data, Method>
  ): void;
  mixin(obj: any): void;
  intercept(event: string, fn: IEventFunction): void;
}

export var JPage: IJPageConstructor;
