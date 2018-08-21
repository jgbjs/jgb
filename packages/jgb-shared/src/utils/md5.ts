import * as crypto from 'crypto';
import * as fs from 'fs';

export default function md5(
  str: string,
  encoding: crypto.HexBase64Latin1Encoding = 'hex'
) {
  return crypto
    .createHash('md5')
    .update(str)
    .digest(encoding);
}

export function file(filename: string) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(filename)
      .pipe(crypto.createHash('md5').setEncoding('hex'))
      .on('finish', function() {
        resolve(this.read());
      })
      .on('error', reject);
  });
}
