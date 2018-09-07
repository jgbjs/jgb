import { promisify } from './index';

type INavigateMethod = 'switchTab' | 'reLaunch' | 'navigateTo' | 'redirectTo';

function safeCall(fn: any, data: any = void 0) {
  if (typeof fn !== 'function') {
    return;
  }
  fn(data);
}

async function iterateCall(
  methods: INavigateMethod[],
  params: wx.NavigateToOptions
) {
  const { success, fail, complete } = params;
  const lastMethod = methods[methods.length - 1];
  const url = params.url;
  for (const method of methods) {
    try {
      // fail will change params.url. like /pages/index/index => pages/index/index.html
      await promisify(wx[method])({ ...params, url });
      safeCall(success);
      break;
    } catch (error) {
      // ignore reject
      if (method === lastMethod) {
        safeCall(fail);
      }
    }
  }

  safeCall(complete);
}

export async function safeNavigate(params: wx.NavigateToOptions) {
  await iterateCall(['navigateTo', 'redirectTo', 'switchTab'], params);
}

export async function safeRedirect(params: wx.NavigateToOptions) {
  await iterateCall(['redirectTo', 'switchTab'], params);
}
