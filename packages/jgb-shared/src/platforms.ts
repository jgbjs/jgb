/**
 * 平台
 */
export enum PLATFORM {
  /** 微信 */
  WEIXIN = 'wx',
  /** 百度 */
  BAIDU = 'swan',
  /** 支付宝 */
  ALIPAY = 'my',
  /** 字节跳动 */
  TOUTIAO = 'tt'
}

const innerMapping = {
  [PLATFORM.WEIXIN]: ['weixn'],
  [PLATFORM.BAIDU]: ['baidu'],
  [PLATFORM.ALIPAY]: ['alipay'],
  [PLATFORM.TOUTIAO]: ['toutiao']
};

/**
 * 转换实际的target
 */
export function transformTarget(target: string) {
  const realTargets = Object.keys(innerMapping);
  for (const t of realTargets) {
    // 在适配名单里
    if (t === target || innerMapping[t].includes(target)) {
      return t;
    }
  }
  throw new Error(`unknow transform: ${target}`);
}
