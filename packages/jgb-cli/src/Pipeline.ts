import { Asset, IInitOptions, Resolver } from 'jgb-shared/lib';
import { logger } from 'jgb-shared/lib/Logger';
import * as VError from 'verror';
import Compiler from './Compiler';

export default class Pipeline {
  compiler: Compiler;
  initPromise: Promise<any>;
  resolver: Resolver;

  constructor(private options: IInitOptions) {
    this.compiler = new Compiler(options);
    this.resolver = new Resolver(options);
    this.initPromise = this.compiler.init(this.resolver);
  }

  // tslint:disable-next-line:no-empty
  async process(
    path: Asset | string,
    distPath: string,
    isWarmUp: boolean
  ): Promise<IPipelineProcessed> {
    await this.initPromise;

    let options = this.options;
    if (isWarmUp) {
      options = Object.assign({ isWarmUp }, options);
    }

    const asset = path instanceof Asset ? path : this.compiler.getAsset(path);
    if (distPath) {
      asset.distPath = distPath;
    }
    await this.processAsset(asset);

    return {
      id: asset.id,
      dependencies: Array.from(asset.dependencies.values()),
      hash: asset.hash,
      cacheData: asset.cacheData
    };
  }

  async processAsset(asset: Asset): Promise<any> {
    try {
      await asset.process();
    } catch (err) {
      // @ts-ignore
      logger.error(`
      file: ${asset.name}
      ${err.stack}
      `)
    }

    return asset.generated;
  }
}
