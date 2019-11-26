declare module 'postcss' {
  function postcss(
    plugins?: any
  ): {
    process: (ast: any, config: any) => any;
  };
  export = postcss;
  namespace postcss {
    export function parse(code: string, config: any): any;
    export function stringify(root: any, fn: any): any;
  }
}

declare module 'postcss-value-parser' {
  function valueParser(params: any): any;
  export = valueParser;
  namespace valueParser {
    export function stringify(media: any): string;
  }
}
