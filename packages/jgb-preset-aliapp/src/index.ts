import * as glob from 'fast-glob';
import BabelPlugin from 'jgb-plugin-babel';
import CssPlugin from 'jgb-plugin-css';
import HtmlPlugin from 'jgb-plugin-html';
import JsonPlugin from 'jgb-plugin-json';
import JsonAsset from 'jgb-plugin-json/lib/JsonAsset';
import { declare, IInitOptions } from 'jgb-shared/lib';
import { ICompiler } from 'jgb-shared/lib/pluginDeclare';
import * as Path from 'path';

interface IPluginConfig {
  coreOptions?: IInitOptions;
}
interface IAppTabBar {
  color: string;
  selectedColor: string;
  backgroundColor: string;
  borderStyle: string;
  list: IAppJsonTabarListConfg[];
  position: string;
}

interface IAppJson {
  pages: string[];
  window: IAppWindowJson;
  tabBar: IAppTabBar;
  subPackages: Array<{
    root: string;
    pages: string[];
  }>;
}

interface IAppWindowJson {
  navigationBarTitleText?: string;
  enablePullDownRefresh?: boolean;
  titleBarColor?: string;
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
  iconPath: string;
  selectedIconPath: string;
}

interface IAliAppTabBar {
  textColor?: string;
  selectedColor?: string;
  backgroundColor?: string;
  items?: IAliAppJsonTabarItemConfig[];
}

interface IAliAppJsonTabarItemConfig {
  pagePath?: string;
  name?: string;
  icon?: string;
  activeIcon?: string;
}

interface IAliappWindowJson {
  defaultTitle?: string;
  pullRefresh?: boolean;
  allowsBounceVertical?: string;
  titleBarColor?: string;
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
}

const EXT_REGEX = /\.(\w)+$/;

export default declare((compiler, pluginConfig: IPluginConfig = {}) => {
  if (pluginConfig && pluginConfig.coreOptions) {
    const entryFiles = []
      .concat(pluginConfig.coreOptions.entryFiles)
      .filter(Boolean);
    if (entryFiles.length === 0) {
      entryFiles.push('app.js', 'app.json', 'app.acss');

      pluginConfig.coreOptions.entryFiles = entryFiles;
    }
  }

  attachCompilerEvent(compiler);

  BabelPlugin(compiler, {});
  JsonPlugin(compiler, {});
  HtmlPlugin(compiler, {
    extensions: ['.axml'],
    outExt: '.axml'
  });

  CssPlugin(compiler, {
    extensions: ['.acss'],
    outExt: '.acss'
  });
});

function attachCompilerEvent(compiler: ICompiler) {
  compiler.on('collect-app-json', collectAppJson);
  compiler.on('collect-page-json', collectPageJson);
}

async function collectPageJson({
  dependences,
  pageJson,
  ctx
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

  // 是否使用组件
  if (
    !pageJson.usingComponents ||
    typeof pageJson.usingComponents !== 'object'
  ) {
    return;
  }
  const extensions = ctx.options.parser.extensions as Map<string, any>;
  const supportExtensions = extensions.keys();
  const components: string[] = [];

  for (const [key, value] of Object.entries(pageJson.usingComponents)) {
    // not relative path
    if (value.indexOf('.') === -1) {
      // alias path
      const {
        distPath,
        relativeRequirePath,
        realName,
        absolutePath
      } = await ctx.resolveAliasName(value);
      if (distPath && relativeRequirePath) {
        const relativeRequire = relativeRequirePath.replace(EXT_REGEX, '');
        pageJson.usingComponents[key] = relativeRequire;
        if (realName) {
          // alias
          components.push(realName);
        }

        if (absolutePath.includes('node_modules')) {
          // npm
          const result = await findPackage(this, Path.dirname(absolutePath));
          if (!result) {
            continue;
          }
          const { pkg, dir } = result;
          // 如果配置了miniprogram小程序组件目录 会copy整个目录
          if (pkg.miniprogram) {
            const npmProjectDir = Path.join(dir, pkg.miniprogram);

            const allMatches = await glob.async(['**/**'], {
              cwd: npmProjectDir
            });
            if (allMatches) {
              allMatches.forEach((file: string) => {
                dependences.add(Path.join(npmProjectDir, file));
              });
            }
          } else {
            // only resolve
            components.push(absolutePath.replace(EXT_REGEX, ''));
          }
        }
        continue;
      }
    }

    components.push(value);
  }

  // expandFiles
  if (components.length > 0) {
    for (const dep of await ctx.expandFiles(
      new Set(components),
      supportExtensions
    )) {
      dependences.add(dep);
    }
  }
}

async function findPackage(ctx: JsonAsset, dir: string) {
  // Find the nearest package.json file within the current node_modules folder
  try {
    const pkg = await ctx.resolver.findPackage(dir);
    return {
      pkg,
      dir: pkg.pkgdir
    };
  } catch (err) {
    // ignore
  }
}

async function collectAppJson({
  dependences,
  appJson,
  ctx
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
    appJson.tabBar.items.forEach(config => {
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

const windowNameMapping: { [key in WeappPageJsonName]: string } = {
  navigationBarTitleText: 'defaultTitle',
  enablePullDownRefresh: 'pullRefresh',
  titleBarColor: 'titleBarColor',
  component: 'component',
  usingComponents: 'usingComponents'
};

const tabBarNameMapping: { [key in WeappTabBarName]?: string } = {
  color: 'textColor',
  selectedColor: 'selectedColor',
  backgroundColor: 'backgroundColor',
  list: 'items'
};

const tabBarItemNameMapping: { [key in WeappTabBarItemName]: string } = {
  pagePath: 'pagePath',
  text: 'name',
  iconPath: 'icon',
  selectedIconPath: 'activeIcon'
};

/** 是否需要转换json */
function needTransformJson(ctx: JsonAsset) {
  return ctx.options.target !== ctx.options.source;
}

// 微信page.json转支付宝微信page.json
function formatAsAliappPageJson(json: IAppJson['window']) {
  const windowJson = {} as IAliAppJson['window'];
  Object.keys(json).forEach((key: WeappWindowName) => {
    const value = windowNameMapping[key] as keyof IAliAppJson['window'];
    if (value) {
      windowJson[value] = json[key];
    }
  });
  return windowJson;
}

// 微信app.json转支付宝app.json
function formatAsAliappJson(json: IAppJson) {
  const aliappJson: IAliAppJson = {};

  aliappJson.pages = json.pages;
  aliappJson.window = {} as any;
  aliappJson.tabBar = {} as any;
  if (json.subPackages && json.subPackages.length) {
    const allSubPages: string[] = [];
    json.subPackages.forEach(sub => {
      const pages = sub.pages.map(page => Path.join(sub.root, page));
      allSubPages.push(...pages);
    });
    aliappJson.pages.push(...allSubPages);
  }

  if (json.window) {
    const windowJSON = formatAsAliappPageJson(json.window);
    aliappJson.window = windowJSON;
  }

  if (json.tabBar) {
    const tabBar = json.tabBar;
    Object.keys(tabBar).forEach((key: WeappTabBarName) => {
      const value = tabBarNameMapping[key] as keyof IAliAppTabBar;
      if (value) {
        if (key === 'list') {
          aliappJson.tabBar[value] = formatAsAliappTabBarItemsJson(tabBar[key]);
          return;
        }
        aliappJson.tabBar[value] = tabBar[key];
      }
    });
  }
  return aliappJson;
}

function formatAsAliappTabBarItemsJson(json: IAppJsonTabarListConfg[]) {
  return json.map(item => {
    const innerItem: IAliAppJsonTabarItemConfig = {};
    Object.keys(item).forEach((itemKey: WeappTabBarItemName) => {
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
