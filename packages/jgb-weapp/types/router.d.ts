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
    complete?: wx.BaseCallback,
    fail?: wx.BaseCallback,
    success?: wx.BaseCallback
  ): void;

  export function push(
    location: ILocation,
    complete?: wx.BaseCallback,
    fail?: wx.BaseCallback,
    success?: wx.BaseCallback
  ): void;

  export function go(delta: number): void;

  export function back(): void;
}
