import babel from 'jgb-plugin-babel/lib/babel';
import BabelAsset from 'jgb-plugin-babel/lib/BabelAsset';

export default class WxsAsset extends BabelAsset {
  static outExt = '.wxs';
  /**
   * wxs 不需要sourcemap
   */
  async loadSourceMap() {
    //
  }

  // wxsBabelTransform() {}

  /**
   * wxs 不需要sourcemap
   */
  async pretransform() {
    //
  }

  /**
   * 多平台转换
   */
  async transform() {
    const target = this.options.target;
    this.babelConfig = {
      plugins: []
    };

    if (isAliapp(target)) {
      this.babelConfig.plugins.push(
        'babel-plugin-transform-commonjs-es2015-modules'
      );
    }

    if (isBaidu(target)) {
      this.babelConfig.plugins.push(
        'babel-plugin-transform-commonjs-es2015-modules'
      );
    }

    await babel(this);
  }

  /**
   * wxs 不需要sourcemap
   */
  async generate(): Promise<any> {
    const result = await super.generate();
    return {
      code: result.code,
      map: '',
      ext: WxsAsset.outExt
    };
  }

  /**
   * 重写 wxs resolveAliasName 固定为输出的outExt
   */
  async resolveAliasName(name: string, ext: string = '') {
    return super.resolveAliasName(name, WxsAsset.outExt);
  }
}

function isAliapp(target: string) {
  return target === 'my' || target === 'aliapp';
}

function isBaidu(target: string) {
  return target === 'swan' || target === 'baidu';
}
