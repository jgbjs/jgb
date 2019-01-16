/// <reference types="@tuhu/miniprogram-api-typings" />

import { INoPromiseApis, IOnAndSyncApis, IOtherApis } from './native-apis';

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any
  ? A
  : never;

type ArgumentType<F extends Function> = F extends (args: infer A) => any
  ? A
  : never;

type SuccessArgumentType<F> = F extends (
  res: {
    success?: (res?: infer U) => void;
  }
) => void
  ? U
  : never;

type TypeOfWx = typeof wx;

type keyOfWx = keyof TypeOfWx;

type PromiseApiKey = keyof IOtherApis;

type NoPromiseApiKey = keyof INoPromiseApis;

type SyncApiKey = keyof IOnAndSyncApis;

type TypePromiseApi<
  K extends PromiseApiKey = PromiseApiKey,
  T extends TypeOfWx = TypeOfWx
> = { [P in K]: PromiseFunc<P, T[P]> };

type TypeNoPromiseApi<
  K extends NoPromiseApiKey = NoPromiseApiKey,
  T extends TypeOfWx = TypeOfWx
> = { [P in K]: T[P] };

type TypeSyncApi<
  K extends SyncApiKey = SyncApiKey,
  T extends TypeOfWx = TypeOfWx
> = { [P in K]: T[P] };

type TypeRequestLikeKey = 'request' | 'downloadFile' | 'uploadFile';

type PromiseFunc<P extends string, T extends (args: any) => any> = (
  args?: ArgumentType<T>
) => P extends TypeRequestLikeKey
  ? RequestTaskExtension<Promise<SuccessArgumentType<T>>, P>
  : Promise<SuccessArgumentType<T>>;

/** 扩展类似请求任务的方法 */
type RequestTaskExtension<
  T extends Promise<any>,
  K extends TypeRequestLikeKey
> = T & ReturnType<TypeOfWx[TypeRequestLikeKey]>;

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

export var jgb: TypePromiseApi & TypeNoPromiseApi & TypeSyncApi & IJGBIntercept;
