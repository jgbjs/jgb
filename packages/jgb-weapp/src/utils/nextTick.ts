// tslint:disable-next-line:ban-types
export default function(fn: Function, ...args: any[]) {
  fn = typeof fn === 'function' ? fn.bind(null, ...args) : fn;
  const p = Promise.resolve();
  // @ts-ignore
  const timerFunc = wx.nextTick
    ? wx.nextTick
    : (fn: any) => {
        p.then(fn);
      };
  timerFunc(fn);
}
