import { Config, IInitOptions } from 'jgb-shared/lib';
import Core from '../core';

export default async function builder(main: any = [], command: any = {}) {
  const config = (await Config.load(process.cwd(), [
    'jgb.config.js'
  ])) as IInitOptions;

  const core = new Core(
    Object.assign(
      {
        cache: true
      },
      config,
      command
    )
  );

  // console.log(main, command);
  await core.start();
}
