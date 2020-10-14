import CssAsset from 'jgb-plugin-css/lib/CssAsset';
import * as Less from 'less';

// @ts-ignore
class FileResolveManager extends Less.FileManager {
  constructor(private asset: CssAsset) {
    super();
  }
  /**
   *
   *
   * @param {string} filename
   * @param {string} currentDirectory
   * @returns {undefined|string}
   */
  async resolve(filename: string, currentDirectory: string) {
    const { relativeRequirePath } = await this.asset.resolveAliasName(filename);
    return relativeRequirePath;
  }

  /**
   * Loads file asynchronously.
   *
   * @param {string} filename
   * @param {string} currentDirectory
   * @param options
   * @param environment
   * @param callback
   * @returns {*|Promise}
   */
  loadFile(
    filename: string,
    currentDirectory: string,
    options: any,
    environment: any,
    callback: any
  ) {
    if (options.syncImport) {
      return super.loadFile(
        filename,
        currentDirectory,
        options,
        environment,
        callback
      );
    }
    return new Promise(async (resolve) => {
      const importPath = await this.resolve(filename, currentDirectory);
      resolve(
        super.loadFile(
          importPath,
          currentDirectory,
          options,
          environment,
          callback
        )
      );
    });
  }

  /**
   * Loads file synchronously.
   *
   * @param {string} filename
   * @param {string} currentDirectory
   * @param options
   * @param environment
   * @param encoding
   * @returns {*|Object}
   */
  // loadFileSync(
  //   filename: string,
  //   currentDirectory: string,
  //   options: any,
  //   environment: any,
  //   encoding: string
  // ) {
  //   const importPath = this.resolve(filename, currentDirectory);
  //   return super.loadFileSync(importPath, '', options, environment, encoding);
  // }
}

export default function fileResolvePlugin(asset: CssAsset) {
  return {
    install: (less: any, pluginManager: any) => {
      pluginManager.addFileManager(new FileResolveManager(asset));
    },
  };
}
