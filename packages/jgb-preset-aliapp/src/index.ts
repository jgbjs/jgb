import BabelPlugin from 'jgb-plugin-babel';
import CssPlugin from 'jgb-plugin-css';
import HtmlPlugin from 'jgb-plugin-html';
import JsonPlugin from 'jgb-plugin-json';
import { declare, IInitOptions } from 'jgb-shared/lib';
import { ICompiler } from 'jgb-shared/lib/pluginDeclare';

interface IPluginConfig {
  coreOptions?: IInitOptions;
}

interface IAliAppTabBar {
  textColor: string;
  selectedColor: string;
  backgroundColor: string;
  items: IAliAppJsonTabarItemConfig[];
}

interface IAliAppJsonTabarItemConfig {
  pagePath: string;
  name: string;
  icon: string;
  activeIcon: string;
}

interface IAppJson {
  pages: string[];
  tabBar: IAliAppTabBar;
}

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
  compiler.on(
    'collect-app-json',
    ({
      dependences,
      appJson
    }: {
      dependences: Set<string>;
      appJson: IAppJson;
    }) => {
      if (!appJson.tabBar) {
        return;
      }
      if (appJson.tabBar) {
        if (appJson.tabBar.items) {
          appJson.tabBar.items.forEach(config => {
            // tslint:disable-next-line:no-unused-expression
            config.icon && dependences.add(config.icon);
            // tslint:disable-next-line:no-unused-expression
            config.activeIcon && dependences.add(config.activeIcon);
          });
        }
      }
    }
  );
}
