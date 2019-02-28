/// <reference types="@tuhu/miniprogram-api-typings" />

import { INoPromiseApis, IOnAndSyncApis, IOtherApis } from './native-apis';

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any
  ? A
  : never;

type ArgumentType<F extends Function> = F extends (args: infer A) => any
  ? A
  : never;

type SuccessArgumentType<F> = F extends (res: {
  success?: (res?: infer U) => void;
}) => void
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
  /**
   * 删除拦截原生方法
   */
  intercept(event: keyOfWx):void;
  /**
   * 拦截原生方法
   *   经过所有拦截状态
   * @param event
   * @param fn
   */
  intercept(event: keyOfWx, fn: IInterceptFn): void;
  /**
   * 拦截原生方法
   * @param event 需要拦截的原生函数
   * @param status 需要拦截函数执行的状态
   * @param fn 拦截函数
   */
  intercept(event: keyOfWx, status: IInterceptStatus, fn: IInterceptFn): void;
}

/** 拦截状态  */
export type IInterceptStatus = 'fail' | 'success' | 'complete' | 'begin';

/** 拦截函数  */
export type IInterceptFn = (
  /** 返回值  */
  result: any,
  /** 状态  */
  status: IInterceptStatus,
  /** 调用方法参数  */
  options: any
) => any;

export var jgb: TypePromiseApi &
  TypeNoPromiseApi &
  TypeSyncApi &
  IJGBIntercept & {
    [key: string]: any;
  };
