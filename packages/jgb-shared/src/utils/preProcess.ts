import { preprocess } from 'preprocess';
import { PLATFORM } from '../platforms';
/**
 * 定义基础文件类型
 */
export enum FileType {
  HTML,
  JS,
  CSS,
  JSON
}

export function preProcess(contents: string, fileType: FileType): string {
  if (!(fileType in FileType)) {
    throw new Error(`cannot recognize filetype`);
  }

  const injectEnv = Object.values(PLATFORM)
    .map(key => {
      return { [key]: process.env.JGB_ENV === key };
    })
    .reduce((obj, value) => {
      return { ...obj, ...value };
    }, {});
  const context = { ...process.env, ...injectEnv };

  if (fileType === FileType.HTML) {
    return preprocess(contents, context, { type: 'html' });
  }

  return preprocess(contents, context, { type: 'js' });
}
