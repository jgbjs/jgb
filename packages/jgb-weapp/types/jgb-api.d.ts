/// <reference types="@tuhu/dt-weapp" />
import { IOnAndSyncApis, IOtherApis, INoPromiseApis } from './native-apis';

type ArgumentTypes<F extends Function> = F extends (...args: infer A) => any
  ? A
  : never;

type TypeOfWx = typeof wx;

interface JGB extends TypeOfWx {}

type keyOfWx = keyof TypeOfWx;

type PromiseApiKey = keyof IOtherApis;

type SyncApiKey = keyof IOtherApis | keyof IOnAndSyncApis;

// type TypePromiseApi<
//   K extends PromiseApiKey = any,
//   T extends TypeOfWx = TypeOfWx
// > = { [P in K]: PromiseFunc<T[P]> };

// type TypeSyncApi<K extends SyncApiKey = any, T extends TypeOfWx = TypeOfWx> = {
//   [P in K]: PromiseFunc<T[P]>
// };
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

export type TypeJGBApi<K extends keyOfWx = keyOfWx, T extends TypeOfWx = TypeOfWx> = {
  [P in K]: PromiseFunc<P, T[P]>
};

export var jgb: TypeJGBApi;

// export var jgb:TypePromiseApi & TypeSyncApi;
