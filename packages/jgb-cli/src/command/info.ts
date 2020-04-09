// @ts-ignore
import * as envinfo from 'envinfo';
import { Config } from 'jgb-shared/lib';

export default async function () {
  const pkg = await Config.load(__dirname, ['package.json']);

  envinfo.run(
    Object.assign(
      {},
      {
        System: ['OS', 'Shell'],
        Binaries: ['Node', 'Yarn', 'npm'],
        npmPackages: `jgb-*`,
        npmGlobalPackages: ['typescript'],
      }
    ),
    {
      console: true,
      title: `jgb-cli ${pkg.version} environment info`,
    }
  );
}
