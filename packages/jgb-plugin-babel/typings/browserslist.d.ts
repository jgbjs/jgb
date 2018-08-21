declare module 'browserslist' {
  function browserslist(browsers: any): any;

  export = browserslist;

  namespace browserslist {
    export function readConfig(config: any): any;
  }
}
