import { formatAsAliappJson, formatAsAliappPageJson } from '../src/index';

// wechat full page.json config
const wxPageJson = {
  component: true,
  usingComponents: {
    testComponent: 'path/to/component'
  },
  navigationBarBackgroundColor: '#000000',
  navigationBarTextStyle: 'white',
  navigationBarTitleText: '导航栏标题文字内容',
  navigationStyle: 'default',
  backgroundColor: '#fff',
  backgroundTextStyle: 'dark',
  enablePullDownRefresh: false,
  onReachBottomDistance: 50,
  disableScroll: false,
  disableSwipeBack: false
};

// wechat app.json config
const wxAppJson = {
  pages: ['pages/index/index', 'pages/logs/index'],
  window: {
    navigationBarBackgroundColor: '#000000',
    navigationBarTextStyle: 'white',
    navigationBarTitleText: '导航栏标题文字内容',
    navigationStyle: 'default',
    enablePullDownRefresh: false,
    backgroundColor: '#fff'
  },
  tabBar: {
    color: '#fff',
    selectedColor: '#ccc',
    backgroundColor: '#000',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '首页',
        iconPath: '/iconPath.jpg',
        selectedIconPath: '/selectedIconPath.jpg'
      },
      {
        pagePath: 'pages/logs/logs',
        text: '日志',
        iconPath: '/iconPath.jpg',
        selectedIconPath: '/selectedIconPath.jpg'
      }
    ]
  },
  networkTimeout: {
    request: 10000,
    downloadFile: 10000
  },
  debug: true,
  navigateToMiniProgramAppIdList: ['wxe5f52902cf4de896']
};

// expect aliapp page json
const aliPageJson = {
  component: true,
  usingComponents: {
    testComponent: 'path/to/component'
  },
  defaultTitle: '导航栏标题文字内容',
  pullRefresh: false
};

// expect aliapp app json
const aliAppJson = {
  pages: ['pages/index/index', 'pages/logs/index'],
  window: {
    titleBarColor: '#000000',
    defaultTitle: '导航栏标题文字内容',
    pullRefresh: false
  },
  tabBar: {
    textColor: '#fff',
    selectedColor: '#ccc',
    backgroundColor: '#000',
    items: [
      {
        pagePath: 'pages/index/index',
        name: '首页',
        icon: '/iconPath.jpg',
        activeIcon: '/selectedIconPath.jpg'
      },
      {
        pagePath: 'pages/logs/logs',
        name: '日志',
        icon: '/iconPath.jpg',
        activeIcon: '/selectedIconPath.jpg'
      }
    ]
  }
};

describe('test wechat json to aliapp json', () => {
  test('page.json', () => {
    const convertedJSON = formatAsAliappPageJson(wxPageJson);
    expect(convertedJSON).toMatchObject(aliPageJson);
  });

  test('app.json', () => {
    const convertedJSON = formatAsAliappJson(wxAppJson);
    expect(convertedJSON).toMatchObject(aliAppJson);

    // expect(convertedJSON.tabBar).toMatchObject(aliAppJson.tabBar);
  });
});

describe('test aliapp json to aliapp json', () => {
  test('page.json', () => {
    const convertedJSON = formatAsAliappPageJson(aliPageJson);
    expect(convertedJSON).toMatchObject(aliPageJson);
  });

  test('app.json', () => {
    const convertedJSON = formatAsAliappJson(aliAppJson);
    expect(convertedJSON).toMatchObject(aliAppJson);
  });
});
