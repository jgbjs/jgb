import { ResolverFactory } from 'enhanced-resolve';

export type IPluginConfig = string | [string] | [string, any];

export type IAliasValue =
  | string
  | {
      /** 路径 */
      path: string;
      /** 相对路径，相对于output目录  */
      dist?: string;
    };

export interface IInitOptions {
  /**
   * 入口文件
   */
  entryFiles?: string | string[];
  /**
   * 源项目类型
   * @default wx 微信小程序
   */
  source?: string;
  /**
   * 输出类型
   * @default wx 微信小程序
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
    [key: string]: IAliasValue | IAliasValue[];
  };

  logLevel?: number;

  /**
   * 是否监听
   */
  watch?: boolean;

  plugins?: IPluginConfig[];
  presets?: IPluginConfig[];

  extensions?: Set<string>;
  parser?: any;
  useLocalWorker?: any;
  publicURL?: string;

  /** 是否内联sourcemap */
  inlineSourceMap?: boolean;
  /** 是否开启缓存 */
  cache?: boolean;
  /** 缓存目录 */
  cacheDir?: string;
  /* 是否压缩 */
  minify?: boolean;
  /* 提供编译钩子回调 */
  hooks?: Array<(...args: any[]) => Promise<void>>;
  /** 转换适配库默认： miniapp-adapter */
  lib?: string;
  /** jgb-cli version */
  cliVersion?: string;

  resolve?: Parameters<typeof ResolverFactory['createResolver']>[0];
}
