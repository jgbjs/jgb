import Asset from '../src/Asset';

export type IPluginConfig = string | [string] | [string, any];

export type IAliasValue =
  | string
  | {
      path: string;
    };

export interface IInitOptions {
  /**
   * 入口文件
   */
  entryFiles?: string | string[];
  /**
   * 输出类型
   */
  target?: string;
  /**
   * 输出目录
   * @default dist
   */
  outDir?: string;
  /**
   * 根目录
   * @default process.cwd()
   */
  rootDir?: string;
  /**
   * node_modules目录所在
   * @default node_modules
   */
  npmDir?: string;
  /**
   * 源目录
   * @default src
   */
  sourceDir?: string;
  /**
   * resolver alias
   */
  alias?: {
    [key: string]: IAliasValue;
  };

  /**
   * 是否监听
   */
  watch?: boolean;

  plugins?: IPluginConfig[];
  presets?: IPluginConfig[];

  extensions?: Map<string, typeof Asset>;
  parser?: any;
  useLocalWorker?: any;
  publicURL?: string;

  /** 是否开启缓存 */
  cache?: boolean;
  /** 缓存目录 */
  cacheDir?: string;
  /* 是否压缩 */
  minify?: boolean;
}
