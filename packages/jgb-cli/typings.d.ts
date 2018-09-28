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

declare module 'user-home' {
  const home: string;
  export = home;
}

declare module 'download-git-repo' {
  function downloadRepo(
    templateName: string,
    dist: string,
    opts: any,
    cb: (err: any) => void
  ): void;
  export = downloadRepo;
  namespace downloadRepo {

  }
}

declare module 'tildify' {
  function tildify(res: string): string;
  export = tildify;
  namespace tildify {

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
