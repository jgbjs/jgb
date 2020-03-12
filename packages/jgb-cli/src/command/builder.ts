import { transformTarget } from 'jgb-shared/lib/platforms';
import { getJGBConfig } from '../config';
import Core from '../core';

export default async function builder(main: any = [], command: any = {}) {
  const config = await getJGBConfig(command.config);

  command.target = transformTarget(command.target || 'wx');

  const core = new Core(
    Object.assign(
      {
        cache: true
      },
      config,
      command
    )
  );

  // console.log(config);
  await core.start();
}
