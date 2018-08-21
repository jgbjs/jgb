import * as types from 'babel-types';

declare module 'babel-types' {
  export function toComputedKey(node: any): any;
  export function valueToNode(value: any): any;
}
