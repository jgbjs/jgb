import { BaseCallback } from "./common";

export type ILocation =
  | string
  | {
      path: string;
      query: any;
      reLaunch: boolean;
    };

export namespace Router {
  export const mode = 'history';

  export function replace(
    location: ILocation,
    complete?: BaseCallback,
    fail?: BaseCallback,
    success?: BaseCallback
  ): void;

  export function push(
    location: ILocation,
    complete?: BaseCallback,
    fail?: BaseCallback,
    success?: BaseCallback
  ): void;

  export function go(delta: number): void;

  export function back(): void;
}
