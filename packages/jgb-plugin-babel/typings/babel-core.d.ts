declare module 'babel-core/lib/transformation/file' {
  // tslint:disable-next-line:max-classes-per-file
  export class File {
    parserOpts: any;
    constructor(config: any);
  }

  export const util: any;
}

declare module 'babel-core/lib/util' {
  export function arrayify(ignore: any, regexify: any): any;
  export const regexify: any;
  export function shouldIgnore(filename: any, ignore: any, only: any): any;
}
