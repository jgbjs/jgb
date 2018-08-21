import * as crypto from 'crypto';

export default async function objectHash(object: any) {
  const hash = crypto.createHash('md5');
  for (const key of Object.keys(object).sort()) {
    const val = object[key];
    if (typeof val === 'object' && val) {
      hash.update(key + objectHash(val));
    } else {
      hash.update(key + val);
    }
  }

  return hash.digest('hex');
}
