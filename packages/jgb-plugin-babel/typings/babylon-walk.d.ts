declare module 'babylon-walk' {
  export function simple(ast: any, visitor: any, ctx: any): any;
  export function ancestor(ast: any, insertGlobals: any, ctx: any);
}
