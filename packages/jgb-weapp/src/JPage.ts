import { IEventFunction } from '../types/eventbus';
import JBase from './JBase';
import expand, { INIT } from './utils/expand';

@expand(Page, 'onLoad')
export default class JPage extends JBase {
  static mixin: (obj: any) => void;
  static intercept: (event: string, fn: IEventFunction) => void;
  static [INIT]: (...data: any[]) => void;

  /**
   * 滚动到指定元素
   * @param selector 选择器
   * @param ctx ctx作用域默认是当前页面
   */
  async $scrollIntoView(selector: string, ctx?: any) {
    let query = wx.createSelectorQuery();
    const getScrollTopPromise = new Promise<number>(resolve =>
      wx
        .createSelectorQuery()
        .selectViewport()
        .scrollOffset(res => {
          resolve(res.scrollTop);
        })
        .exec()
    );

    if (ctx) {
      query = query.in(ctx);
    }

    const getRectTopPromise = new Promise<number>(resolve => {
      query.select(selector).boundingClientRect(rect => {
        if (!rect) {
          return resolve(0);
        }
        resolve(rect.top);
      }).exec();
    });

    const realTop = (await getScrollTopPromise) + (await getRectTopPromise);

    wx.pageScrollTo({
      scrollTop: realTop
    });
  }

  constructor(opts?: any) {
    super();
    if (!(this instanceof JPage)) {
      return new JPage(opts);
    }

    JPage[INIT](opts, this);
  }
}

export const ADD_SHOW_HANDLER = 'ADD_SHOW_HANDLER';
export const ADD_HIDE_HANDLER = 'ADD_HIDE_HANDLER';

/** register hook store name 兼容Component pageLifetimes */
export const SHOW_HANDLER = 'PAGE_LIFE_SHOW';
export const HIDE_HANDLER = 'PAGE_LIFE_HIDE';

type AnyFunction = (...args: any[]) => any;

/**
 * 加载流程
 * Component: created
 * Component: attacted
 * Page: onLoad
 * Component: show
 * Page: onShow
 * Component: ready
 */

JPage.mixin({
  [ADD_SHOW_HANDLER]: handlerFactory(SHOW_HANDLER),
  [ADD_HIDE_HANDLER]: handlerFactory(HIDE_HANDLER),
  onShow() {
    invokeHandler(SHOW_HANDLER, this);
  },
  onHide() {
    invokeHandler(HIDE_HANDLER, this);
  },
  onUnload(this: JPage) {
    this.$destory();
  }
});

function handlerFactory(eventName: string) {
  return function(fn: AnyFunction) {
    if (typeof fn !== 'function') {
      return;
    }

    if (!this[eventName]) {
      this[eventName] = [];
    }

    this[eventName].push(fn);
  };
}

function invokeHandler(eventName: string, ctx: any) {
  try {
    (ctx[eventName] || []).forEach((fn: AnyFunction) => {
      if (typeof fn !== 'function') {
        return;
      }
      fn();
    });
  } catch (error) {
    console.error(error);
  }
}
