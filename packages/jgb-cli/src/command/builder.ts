import { getJGBConfig } from '../config';
import Core from '../core';

export default async function builder(main: any = [], command: any = {}) {
  const config = await getJGBConfig(command.config);

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
