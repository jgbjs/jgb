// @ts-ignore
import * as envinfo from 'envinfo';
import { Config } from 'jgb-shared/lib';
import { logger } from 'jgb-shared/lib/Logger';
import { transformTarget } from 'jgb-shared/lib/platforms';
import semver = require('semver');
import { getJGBConfig, normalizeConfig } from '../config';
import Core from '../core';

export default async function builder(main: any = [], command: any = {}) {
  const config = await getJGBConfig(command.config);

  command.target = transformTarget(command.target || 'wx');
  
  const core = new Core(
    normalizeConfig({
      cache: true,
      ...config,
      ...command,
    })
  );

  await updateInfo(command);

  // console.log(config);
  await core.start();
}

async function updateInfo(command: any) {
  const pkg = await Config.load(process.cwd(), ['package.json']);
  const npmPackages = ['jgb-shared']
    .concat(
      Object.keys(pkg.dependencies || {}),
      Object.keys(pkg.devDependencies || {})
    )
    .filter((key) => key.includes('jgb-plugin') || key.includes('jgb-preset'));

  const [, info] = await envinfo.helpers.getnpmPackages(npmPackages, {
    showNotFound: true,
  });

  for (const npm of Object.keys(info)) {
    const value = info[npm];
    const { installed } = value;
    const isValid = semver.satisfies(installed, `~${command.cliVersion}`);
    if (!isValid) {
      logger.warning(
        `please update ${npm}@${installed} to ${npm}^${command.cliVersion}`
      );
    }
  }
}
