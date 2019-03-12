export type BaseCallback = (res: any) => void;

export type Accessors<T> = { [K in keyof T]: () => T[K] };

export interface BaseOptions {
  /**
   * 接口调用成功的回调函数
   */
  success?: BaseCallback;

  /**
   * 接口调用失败的回调函数
   */
  fail?: BaseCallback;

  /**
   * 接口调用结束的回调函数（调用成功、失败都会执行）
   */
  complete?: BaseCallback;
}

export interface NavigateToOptions extends BaseOptions {
  /**
   * 需要跳转的应用内页面的路径 , 路径后可以带参数。
   * 参数与路径之间使用?分隔，参数键与参数值用=相连，不同参数用&分隔；如 'path?key=value&key2=value2'
   * 注意：目前页面路径最多只能十层。
   */
  url: string;
}

export type DefaultData<V> = object | ((this: V) => object);

export interface DefaultMethods<V> {
  [key: string]: (this: V, ...args: any[]) => any;
}
