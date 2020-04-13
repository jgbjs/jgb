import { Asset, IInitOptions, Resolver } from 'jgb-shared/lib';
import { IAssetGenerate, IDepOptions } from 'jgb-shared/lib/Asset';
import { logger } from 'jgb-shared/lib/Logger';
import Compiler from './Compiler';

export interface IPipelineProcessed {
  id: string;
  dependencies: IDepOptions[];
  hash: string;
  cacheData?: any;
  generated: IAssetGenerate | IAssetGenerate[];
}

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
      cacheData: asset.cacheData,
      generated: asset.generated,
    };
  }

  async processAsset(asset: Asset) {
    try {
      await asset.process();
    } catch (err) {
      err.fileName = asset.name;
      // logger.error(`file: ${asset.name}`);
      // logger.error(` errMsg: ${err.message}`);
      // logger.error(err.stack);
      throw err;
    }

    return asset.generated;
  }
}
