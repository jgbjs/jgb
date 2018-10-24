import { IPlugin } from '../../types/plugins';
import { ILocation } from '../../types/router';
import { safeNavigate, safeRedirect } from '../utils/navigate';
import { stringifyQuery } from '../utils/query';

// tslint:disable-next-line:variable-name
let _route = {};

// tslint:disable-next-line:variable-name
const _router = {
  mode: 'history',
  push,
  replace,
  go,
  back
};

Object.defineProperty(_router, 'currentRoute', {
  get() {
    return _route;
  }
});

const routerPlugin: IPlugin = {
  install: res => {
    const { JPage } = res;

    // tslint:disable-next-line:variable-name
    let _query: any;

    JPage.mixin({
      onLoad(options: any) {
        _query = options;

        _route = parseRoute(this.route || this.__route__, _query);

        Object.defineProperty(this, '$router', {
          get() {
            return _router;
          }
        });

        Object.defineProperty(this, '$route', {
          get() {
            return _route;
          }
        });
      }
    });
  }
};

export default routerPlugin;

export const Router = _router;

function push(
  location: ILocation,
  complete?: wx.BaseCallback,
  fail?: wx.BaseCallback,
  success?: wx.BaseCallback
) {
  const url = parseUrl(location);
  const params = { url, complete, fail, success };

  if (typeof location !== 'string') {
    if (location.reLaunch) {
      wx.reLaunch(params);
      return;
    }
  }

  safeNavigate(params);
}

function replace(
  location: ILocation,
  complete?: wx.BaseCallback,
  fail?: wx.BaseCallback,
  success?: wx.BaseCallback
) {
  const url = parseUrl(location);
  safeRedirect({
    url,
    complete,
    fail,
    success
  });
}

function go(delta: number) {
  wx.navigateBack({ delta });
}

function back() {
  wx.navigateBack({ delta: 1 });
}

function parseUrl(location: any) {
  if (typeof location === 'string') {
    return location;
  }

  const { path, query } = location;
  const queryStr = stringifyQuery(query);

  return `${path}${queryStr}`;
}

function parseRoute(path: string, query: any) {
  return {
    path: `/${path}`,
    params: {},
    query,
    hash: '',
    fullPath: parseUrl({
      path: `/${path}`,
      query
    }),
    name: path && path.replace(/\/(\w)/g, ($0, $1) => $1.toUpperCase())
  };
}
