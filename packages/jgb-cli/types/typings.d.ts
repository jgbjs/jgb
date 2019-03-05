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

declare module 'js-beautify' {
  function beautify(code: string, opts?: any): string;
  export = beautify;
  namespace beautify {
    export const css: typeof beautify;
    export const html: typeof beautify;
  }
}

declare module 'is-glob' {
  function isGlob(name: string): boolean;
  export = isGlob;
  namespace isGlob {}
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
  namespace downloadRepo {}
}

declare module 'diff' {
  const diff: {
    createPatch(...args: any[]): string;
  };
  export = diff;
  namespace diff {}
}

declare module 'tildify' {
  function tildify(res: string): string;
  export = tildify;
  namespace tildify {}
}

declare module 'read-metadata' {
  export function sync(json: string): any;
}

declare module 'validate-npm-package-name' {
  function validateName(name: string): any;
  export = validateName;
}

declare module 'rimraf' {
  function rimraf(f: string, options?: any, cb?: any): any;
  export = rimraf;
  namespace rimraf {}
}
