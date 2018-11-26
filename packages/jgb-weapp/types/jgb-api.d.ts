/// <reference types="miniprogram-api-typings" />

import { IOnAndSyncApis, IOtherApis, INoPromiseApis } from './native-apis';

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any
  ? A
  : never;

type TypeOfWx = typeof wx;

interface JGB extends TypeOfWx {}

type keyOfWx = keyof TypeOfWx;

type PromiseApiKey = keyof IOtherApis;

type SyncApiKey = keyof INoPromiseApis & keyof IOnAndSyncApis;

type TypePromiseApi<
  K extends PromiseApiKey = PromiseApiKey,
  T extends TypeOfWx = TypeOfWx
> = { [P in K]: PromiseFunc<P, T[P]> };

type TypeSyncApi<
  K extends SyncApiKey = SyncApiKey,
  T extends TypeOfWx = TypeOfWx
> = { [P in K]: PromiseFunc<P, T[P]> };

type TypeRequestLikeKey = 'request' | 'downloadFile' | 'uploadFile';

type PromiseFunc<P extends string, T extends (...args: any[]) => any> = (
  ...args: ArgumentTypes<T>
) => P extends TypeRequestLikeKey
  ? RequestTaskExtension<Promise<ReturnType<T>>>
  : Promise<ReturnType<T>>;

type RequestTaskExtension<
  T extends Promise<any>,
  K extends TypeRequestLikeKey = 'request'
> = T & {
  abort(cb: () => any): void;
  progress(cb: (...args: any[]) => any): void;
};

// export type TypeJGBApi<
//   K extends keyOfWx = keyOfWx,
//   T extends TypeOfWx = TypeOfWx
// > = { [P in K]: PromiseFunc<P, T[P]> };

export interface IJGBIntercept {
  intercept(event: keyOfWx, fn: IInterceptFn): void;
  intercept(event: keyOfWx, status: IInterceptStatus, fn: IInterceptFn): void;
}

export type IInterceptStatus = 'fail' | 'success' | 'complete' | 'begin';

export type IInterceptFn = (
  /** 返回值  */
  result: any,
  /** 状态  */
  status: IInterceptStatus,
  /** 调用方法参数  */
  options: any
) => any;

// export var jgb: TypeJGBApi & IJGBIntercept;

export var jgb: TypePromiseApi & TypeSyncApi & IJGBIntercept;

