import { IEventFunction } from '../types/eventbus';
import JBase from './JBase';
import expand, { INIT } from './utils/expand';

@expand(Page, 'onLoad')
export default class JPage extends JBase {
  static mixin: (obj: any) => void;
  static intercept: (event: string, fn: IEventFunction) => void;
  static [INIT]: (...data: any[]) => void;

  async $scrollIntoView(id: string, ctx?: any) {
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
      query.select(id).boundingClientRect(rect => {
        if (!rect) {
          return resolve(0);
        }
        resolve(rect.top);
      });
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

JPage.mixin({
  onUnload() {
    this.$destory();
  }
});
