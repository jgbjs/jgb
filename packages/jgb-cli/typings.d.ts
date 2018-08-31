declare module '*.json' {
  const value: any;
  export default value;
  export const version: string;
}

declare module 'fswatcher-child' {
  class FSWatcher {
    constructor(opts: any);
  }
  export = FSWatcher;
}

declare module 'is-glob' {
  function isGlob(name: string): boolean;
  export = isGlob;
  namespace isGlob {

  }
}

declare module 'rimraf' {
  function rimraf(f: string, options?: any, cb?: any): any;
  export = rimraf;
  namespace rimraf {

  }
}

interface IPipelineProcessed {
  id: string;
  dependencies: any[];
  hash: string;
  cacheData?: any;
}
