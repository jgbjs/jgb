// tslint:disable-next-line:ban-types
export default function(fn: Function, ...args: any[]) {
  fn = typeof fn === 'function' ? fn.bind(null, ...args) : fn;
  // @ts-ignore
  const timerFunc = wx.nextTick ? wx.nextTick : setTimeout;
  timerFunc(fn);
}
