declare module 'posthtml' {
  function posthtml(plugins: any): any;
  export = posthtml;

  namespace posthtml {

  }
}

declare module 'posthtml/lib/api' {
  export const walk: any;
  export const match: any;
}
