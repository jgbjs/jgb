import * as glob from 'fast-glob';
import * as fse from 'fs-extra';
import BabelPlugin from 'jgb-plugin-babel';
import CssPlugin from 'jgb-plugin-css';
import HtmlPlugin from 'jgb-plugin-html';
import JsonPlugin from 'jgb-plugin-json';
import JsonAsset from 'jgb-plugin-json/lib/JsonAsset';
import { declare, IInitOptions } from 'jgb-shared/lib';
import { ICompiler } from 'jgb-shared/lib/pluginDeclare';
import { pathToUnixType } from 'jgb-shared/lib/utils';
import * as Path from 'path';
import _ = require('lodash');

interface IPluginConfig {
  coreOptions?: IInitOptions;
}
interface IAppTabBar {
  color: string;
  selectedColor: string;
  backgroundColor: string;
  borderStyle?: string;
  list: IAppJsonTabarListConfg[];
  position?: string;
  custom?: boolean;
}

interface IAppJson {
  pages: string[];
  window?: IAppWindowJson;
  tabBar?: IAppTabBar;
  subPackages?: Array<{
    root: string;
    pages: string[];
  }>;
  /**
   * 全局组件
   */
  usingComponents: {
    [componentName: string]: string;
  };
}

interface IAppWindowJson {
  navigationBarBackgroundColor?: string;
  navigationBarTextStyle?: string;
  navigationBarTitleText?: string;
  enablePullDownRefresh?: boolean;
  backgroundColor?: string;
  onReachBottomDistance?: number;
}

interface IPageJson extends IAppWindowJson {
  usingComponents?: {
    [name: string]: string;
  };
  component?: boolean;
}

interface IAppJsonTabarListConfg {
  pagePath: string;
  text: string;
  iconPath?: string;
  selectedIconPath?: string;
}

interface IAliAppTabBar {
  textColor?: string;
  selectedColor?: string;
  backgroundColor?: string;
  items?: IAliAppJsonTabarItemConfig[];
}

interface IAliAppJsonTabarItemConfig {
  [key: string]: string;
  pagePath?: string;
  name?: string;
  icon?: string;
  activeIcon?: string;
}

interface IAliappWindowJson {
  /**页面默认标题。 */
  defaultTitle?: string;
  /** 是否允许下拉刷新，默认 true*/
  pullRefresh?: boolean;
  /** allowsBounceVertical */
  allowsBounceVertical?: string;
  /** 导航栏背景色。 */
  titleBarColor?: string;
  /** 导航栏透明设置。默认 none，支持 always 一直透明 / auto 滑动自适应 / none 不透明。 */
  transparentTitle?: string;
  /** 页面的背景色。 */
  backgroundColor?: string;
  /** 仅支持 Android，是否显示 WebView 滚动条。默认 YES，支持 YES / NO。  */
  enableScrollBar?: string;
}

interface IAliappPageJson extends IAliappWindowJson {
  usingComponents?: {
    [name: string]: string;
  };
  component?: boolean;
}

interface IAliAppJson {
  pages?: string[];
  window?: IAliappWindowJson;
  tabBar?: IAliAppTabBar;
  subPackages?: Record<string, any>;
  /**
   * 全局组件
   */
  usingComponents?: {
    [componentName: string]: string;
  };
}

const EXT_REGEX = /\.(\w)+$/;

export default declare((compiler, pluginConfig: IPluginConfig = {}) => {
  attachCompilerEvent(compiler);

  BabelPlugin(compiler, {});
  JsonPlugin(compiler, {});
  HtmlPlugin(compiler, {
    extensions: ['.axml'],
    outExt: '.axml',
  });

  CssPlugin(compiler, {
    extensions: ['.acss'],
    outExt: '.acss',
  });
});

function attachCompilerEvent(compiler: ICompiler) {
  compiler.on('collect-app-json', collectAppJson);
  compiler.on('collect-page-json', collectPageJson);
}

const gcn = '.gcn';

function setGlobalComponent(comps: Record<string, string>) {
  fse.writeFileSync('.cache/' + gcn, JSON.stringify(comps));
}

function getGlobalComponent(): Record<string, string> {
  return fse.readJsonSync('.cache/' + gcn, { throws: false }) || {};
}

async function collectPageJson({
  dependences,
  pageJson,
  ctx,
}: {
  dependences: Set<string>;
  pageJson: IAliappPageJson;
  ctx: JsonAsset;
}) {
  if (needTransformJson(ctx)) {
    pageJson = formatAsAliappPageJson(pageJson as any);
    ctx.contents = JSON.stringify(pageJson);
    ctx.ast = pageJson;
  }

  // 非微信平台都不支持全局组件。
  // 所有页面组件都要，添加全局组件
  // 避免自己引用自己
  if (process.env.JGB_ENV !== 'wx') {
    const globalComponents = getGlobalComponent();
    if (Object.keys(globalComponents)) {
      pageJson.usingComponents = {
        ..._.pickBy(globalComponents, (value: string) => {
          return !ctx.name.includes(value);
        }),
        ...(pageJson.usingComponents || {}),
      };
    }
  }
  await addComponents(dependences, pageJson, ctx);
}

async function addComponents(
  dependences: Set<string>,
  json: IPageJson | IAppJson,
  ctx: JsonAsset
) {
  // 是否使用组件
  if (!json.usingComponents || typeof json.usingComponents !== 'object') {
    return;
  }
  const extensions = ctx.options.parser.extensions as Map<string, any>;
  const supportExtensions = extensions.keys();
  const components: string[] = [];

  const usingComponent = usingNpmComponents.bind(ctx);
  const realPathUsingComponent = {} as Record<string, string>;

  for (const [key, value] of Object.entries(json.usingComponents)) {
    // 插件
    if (value.includes('://')) {
      continue;
    }
    const componentPath = await findComponent(value, ctx);
    try {
      realPathUsingComponent[key] = componentPath;
      await usingComponent(key, componentPath, json, dependences, components);
    } catch (error) {
      console.error('usingComponent Error', error);
    }
  }

  // expandFiles
  if (components.length > 0) {
    // app.json 中 usingComponent视为全局组件
    if ((json as IAppJson).pages && process.env.JGB_ENV !== 'wx') {
      setGlobalComponent(realPathUsingComponent);
      delete json.usingComponents;
    }

    for (const dep of await ctx.expandFiles(
      new Set(components),
      supportExtensions
    )) {
      dependences.add(dep);
    }
  }
}

/**
 * 找到组件路径，并返回相对编译后的路径
 * @param componentPath
 */
export async function findComponent(componentPath: string, ctx: JsonAsset) {
  // resolve alias
  try {
    const result = await ctx.resolver.resolve(componentPath);
    if (result && result.path) {
      componentPath = result.path.replace(/\.(\w+)$/, '');
    }
  } catch (error) {}

  if (componentPath.startsWith('.') || componentPath.startsWith('/')) {
    return componentPath;
  }

  const module = await ctx.resolver.resolveModule(componentPath, null);
  if (!module) {
    return componentPath;
  }

  const pkg =
    'moduleDir' in module && module.moduleDir
      ? await ctx.resolver.findPackage(module.moduleDir)
      : {};

  if (
    module.filePath &&
    (fse.existsSync(module.filePath) ||
      fse.existsSync(module.filePath + '.json'))
  ) {
    return module.filePath;
  }

  // 根据pkg.miniprogram查找
  if (pkg.miniprogram) {
    const realComponentPath = Path.join(
      module.moduleDir,
      pkg.miniprogram,
      module.subPath
    );

    if (fse.existsSync(realComponentPath + '.json')) {
      return realComponentPath;
    }
  }
}

export async function usingNpmComponents(
  this: JsonAsset,
  key: string,
  value: string,
  pageJson: IPageJson,
  dependences: Set<string>,
  components: string[]
): Promise<boolean> {
  // let distPath = '';
  // let relativeRequirePath = '';
  // let realName = '';
  // let absolutePath = '';
  /**
   * value maybe:
   *  xxx/xx => 可能找不到文件，需要根据pkg.miniprogram
   *  xxx
   *  @xxx/xxx
   */
  const {
    distPath,
    relativeRequirePath,
    realName,
    absolutePath,
  } = await this.resolveAliasName(value);

  if (distPath && relativeRequirePath) {
    const relativeRequire = relativeRequirePath.replace(EXT_REGEX, '');
    pageJson.usingComponents[key] = relativeRequire;
    if (realName) {
      // alias
      const componentPath = pathToUnixType(absolutePath.replace(EXT_REGEX, ''));
      components.push(componentPath);
    }

    if (absolutePath.includes('node_modules')) {
      // npm
      const pkgJson = await findPackage(this, Path.dirname(absolutePath));
      if (!pkgJson) {
        return;
      }
      const { pkg, dir } = pkgJson;
      // 如果配置了miniprogram小程序组件目录 会copy整个目录
      if (pkg.miniprogram) {
        const npmProjectDir = Path.join(dir, pkg.miniprogram);

        const allMatches = await glob.async(['**/**'], {
          cwd: npmProjectDir,
        });
        if (allMatches) {
          allMatches.forEach((file: string) => {
            dependences.add(Path.join(npmProjectDir, file));
          });
          return true;
        }
      } else {
        // only resolve
        components.push(absolutePath.replace(EXT_REGEX, ''));
        return true;
      }
    }
  }
}

async function findPackage(ctx: JsonAsset, dir: string) {
  // Find the nearest package.json file within the current node_modules folder
  try {
    const pkg = await ctx.resolver.findPackage(dir);
    return {
      pkg,
      dir: pkg.pkgdir,
    };
  } catch (err) {
    // ignore
  }
}

async function collectAppJson({
  dependences,
  appJson,
  ctx,
}: {
  dependences: Set<string>;
  appJson: IAliAppJson;
  ctx: JsonAsset;
}) {
  if (needTransformJson(ctx)) {
    appJson = formatAsAliappJson(appJson as any);
    ctx.contents = JSON.stringify(appJson);
    ctx.ast = appJson;
  }

  const extensions = ctx.options.parser.extensions as Map<string, any>;
  const supportExtensions = extensions.keys();
  const assetPaths: string[] = [];

  // pages asset
  if (Array.isArray(appJson.pages)) {
    assetPaths.push(...appJson.pages);
  }

  // subPackages asset
  // fix wechatminiprogram support [subpackages]
  const subPackages = appJson.subPackages;
  if (Array.isArray(subPackages)) {
    // tslint:disable-next-line:no-shadowed-variable
    subPackages.forEach(({ root, pages }) => {
      const subPackagePages = pages.map((page: string) =>
        Path.join(root, page)
      );
      assetPaths.push(...subPackagePages);
    });
  }

  const usingComponents = appJson.usingComponents;
  if (usingComponents) {
    await addComponents(dependences, appJson, ctx);
  }

  // expandFiles
  if (Array.isArray(assetPaths)) {
    for (const dep of await ctx.expandFiles(
      new Set(assetPaths),
      supportExtensions
    )) {
      dependences.add(dep);
    }
  }

  // tabBar asset
  if (appJson.tabBar && Array.isArray(appJson.tabBar.items)) {
    appJson.tabBar.items.forEach((config) => {
      // tslint:disable-next-line:no-unused-expression
      config.icon && dependences.add(config.icon);
      // tslint:disable-next-line:no-unused-expression
      config.activeIcon && dependences.add(config.activeIcon);
    });
  }
}

type WeappWindowName = keyof IAppJson['window'];

type WeappTabBarName = keyof IAppTabBar;

type WeappTabBarItemName = keyof IAppJsonTabarListConfg;

type WeappPageJsonName = keyof IPageJson;

const windowNameMapping: { [key in WeappPageJsonName]?: string } = {
  navigationBarTitleText: 'defaultTitle',
  enablePullDownRefresh: 'pullRefresh',
  navigationBarBackgroundColor: 'titleBarColor',
  component: 'component',
  usingComponents: 'usingComponents',
};

/** aliapp中page.json生效的关键字 */

const PageEnableKey = [
  'defaultTitle',
  'pullRefresh',
  'allowsBounceVertical',
  'titleBarColor',
  'transparentTitle',
  'titlePenetrate',
  'showTitleLoading',
  'backgroundColor',
  'enableScrollBar',
  'component',
  'usingComponents',
];

/** aliapp中 app.json中 tabBar生效的关键字 */
const TabBarEnableKey = [
  'textColor',
  'selectedColor',
  'backgroundColor',
  'items',
];

const TabBarItemEnableKey = ['pagePath', 'name', 'icon', 'activeIcon'];

const tabBarNameMapping: { [key in WeappTabBarName]?: string } = {
  color: 'textColor',
  selectedColor: 'selectedColor',
  backgroundColor: 'backgroundColor',
  list: 'items',
};

const tabBarItemNameMapping: { [key in WeappTabBarItemName]?: string } = {
  pagePath: 'pagePath',
  text: 'name',
  iconPath: 'icon',
  selectedIconPath: 'activeIcon',
};

/** 是否需要转换json */
function needTransformJson(ctx: JsonAsset) {
  return ctx.options.target !== ctx.options.source;
}

/**
 * 微信page|component.json转支付宝微信page|component.json
 * @param json
 */
export function formatAsAliappPageJson(json: any): IAliappWindowJson {
  const windowJson = {} as any;
  Object.keys(json).forEach((key: WeappWindowName) => {
    // 当遇到支付宝小程序中page.json关键字时直接赋值
    if (PageEnableKey.includes(key as keyof IAliappPageJson)) {
      windowJson[key] = json[key];
      return;
    }
    const value = windowNameMapping[key] as keyof IAliAppJson['window'];
    if (value) {
      windowJson[value] = json[key];
    }

    // 自定义导航栏
    if (json.navigationStyle === 'custom' || process.env.customNavBar) {
      windowJson.transparentTitle = 'always';
      windowJson.titlePenetrate = 'YES';
      windowJson.defaultTitle = '';
    }
  });
  return windowJson;
}

/**
 * 微信app.json转支付宝app.json
 * @param json
 */
export function formatAsAliappJson(json: any) {
  const aliappJson: IAliAppJson = {};

  aliappJson.pages = json.pages;
  aliappJson.window = {} as any;
  aliappJson.tabBar = {} as any;
  aliappJson.subPackages = json.subPackages || {};
  aliappJson.usingComponents = json.usingComponents || {};
  // 支付宝已经支持分包功能
  // if (json.subPackages && json.subPackages.length) {
  //   const allSubPages: string[] = [];
  //   json.subPackages.forEach((sub: any) => {
  //     const pages = sub.pages.map((page: string) =>
  //       pathToUnixType(Path.join(sub.root, page))
  //     );
  //     allSubPages.push(...pages);
  //   });
  //   aliappJson.pages.push(...allSubPages);
  // }

  if (json.window) {
    const windowJSON = formatAsAliappPageJson(json.window);
    aliappJson.window = windowJSON;
  }

  if (json.tabBar) {
    const tabBar = formatAsAliappTabBarJson(json.tabBar);
    aliappJson.tabBar = tabBar;
  }
  return aliappJson;
}

export function formatAsAliappTabBarJson(tabBar: any): IAliAppTabBar {
  const returnValue = {} as any;
  Object.keys(tabBar).forEach((key: WeappTabBarName) => {
    if (TabBarEnableKey.includes(key)) {
      returnValue[key] = tabBar[key];
      return;
    }
    const value = tabBarNameMapping[key] as keyof IAliAppTabBar;
    if (value) {
      if (key === 'list') {
        returnValue[value] = formatAsAliappTabBarItemsJson(tabBar[key]);
        return;
      }
      returnValue[value] = tabBar[key];
    }
  });

  return returnValue;
}

export function formatAsAliappTabBarItemsJson(json: any[]) {
  return json.map((item) => {
    const innerItem: IAliAppJsonTabarItemConfig = {};
    Object.keys(item).forEach((itemKey: WeappTabBarItemName) => {
      if (TabBarItemEnableKey.includes(itemKey)) {
        innerItem[itemKey] = item[itemKey] as any;
        return;
      }
      const replacedItemKey = tabBarItemNameMapping[
        itemKey
      ] as keyof IAliAppJsonTabarItemConfig;
      if (replacedItemKey) {
        innerItem[replacedItemKey] = item[itemKey];
      }
    });
    return innerItem;
  });
}
