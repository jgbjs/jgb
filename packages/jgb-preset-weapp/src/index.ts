import * as glob from 'fast-glob';
import BabelPlugin from 'jgb-plugin-babel';
import CssPlugin from 'jgb-plugin-css';
import HtmlPlugin from 'jgb-plugin-html';
import JsonPlugin from 'jgb-plugin-json';
import JsonAsset from 'jgb-plugin-json/lib/JsonAsset';
import { declare, IInitOptions } from 'jgb-shared/lib';
import { logger } from 'jgb-shared/lib/Logger';
import { ICompiler } from 'jgb-shared/lib/pluginDeclare';
import { pathToUnixType } from 'jgb-shared/lib/utils';
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
  tabBar: IAppTabBar;
  subPackages: Array<{
    root: string;
    pages: string[];
  }>;
}

interface IAppJsonTabarListConfg {
  pagePath: string;
  text: string;
  iconPath: string;
  selectedIconPath: string;
}

interface IPageJson {
  usingComponents: {
    [componentName: string]: string;
  };
}

export default declare((compiler, pluginConfig: IPluginConfig = {}) => {
  if (pluginConfig && pluginConfig.coreOptions) {
    const entryFiles = []
      .concat(pluginConfig.coreOptions.entryFiles)
      .filter(Boolean);
    if (entryFiles.length === 0) {
      entryFiles.push('app.js', 'app.json', 'app.wxss');

      pluginConfig.coreOptions.entryFiles = entryFiles;
    }
  }

  attachCompilerEvent(compiler);

  BabelPlugin(compiler, {});
  JsonPlugin(compiler, {});
  HtmlPlugin(compiler, {
    extensions: ['.wxml'],
    outExt: '.wxml'
  });

  CssPlugin(compiler, {
    extensions: ['.wxss'],
    outExt: '.wxss'
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
  pageJson: IPageJson;
  ctx: JsonAsset;
}) {
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

  const findComponent = usingNpmComponents.bind(ctx);

  for (const [key, value] of Object.entries(pageJson.usingComponents)) {
    // not relative path
    if (value.indexOf('.') === -1) {
      try {
        await findComponent(key, value, pageJson, dependences, components);
      } catch (error) {
        // xxx/yy, xxx\\yy => [xxx, yy]
        const spValue = value.split(/[\/|\\]/);
        if (spValue.length === 1) {
          logger.error(error);
          continue;
        }
        const module = await ctx.resolver.resolveModule(spValue[0], null);
        // node_modules
        if ('moduleDir' in module && module.moduleDir) {
          const pkg = await ctx.resolver.findPackage(module.moduleDir);
          // const pkgJson = await findPackage(ctx, Path.dirname(absolutePath));
          // 可能找不到文件，需要根据pkg.miniprogram查找
          if (pkg.miniprogram) {
            const componentPath = Path.join(
              spValue[0],
              pkg.miniprogram,
              ...spValue.slice(1)
            );
            const isSuccess = await findComponent(
              key,
              componentPath,
              pageJson,
              dependences,
              components
            );
            if (!isSuccess) {
              logger.error(error);
            }
          }
        }
      }

      continue;
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

async function usingNpmComponents(
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
    absolutePath
  } = await this.resolveAliasName(value);

  if (distPath && relativeRequirePath) {
    const relativeRequire = relativeRequirePath.replace(/\.(\w)+/, '');
    pageJson.usingComponents[key] = relativeRequire;
    if (realName) {
      // alias
      const componentPath = pathToUnixType(absolutePath.replace(/\.(\w)+/, ''));
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
          cwd: npmProjectDir
        });
        if (allMatches) {
          allMatches.forEach((file: string) => {
            dependences.add(Path.join(npmProjectDir, file));
          });
          return true;
        }
      } else {
        // only resolve
        components.push(absolutePath.replace(/\.(\w)+/, ''));
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
  appJson: IAppJson;
  ctx: JsonAsset;
}) {
  const extensions = ctx.options.parser.extensions as Map<string, any>;
  const supportExtensions = extensions.keys();
  const assetPaths: string[] = [];

  // pages asset
  if (Array.isArray(appJson.pages)) {
    assetPaths.push(...appJson.pages);
  }

  // subPackages asset
  if (Array.isArray(appJson.subPackages)) {
    // tslint:disable-next-line:no-shadowed-variable
    appJson.subPackages.forEach(({ root, pages }) => {
      const subPackagePages = pages.map(page => Path.join(root, page));
      assetPaths.push(...subPackagePages);
    });
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
  if (appJson.tabBar && Array.isArray(appJson.tabBar.list)) {
    appJson.tabBar.list.forEach(config => {
      // tslint:disable-next-line:no-unused-expression
      config.iconPath && dependences.add(config.iconPath);
      // tslint:disable-next-line:no-unused-expression
      config.selectedIconPath && dependences.add(config.selectedIconPath);
    });
  }
}
