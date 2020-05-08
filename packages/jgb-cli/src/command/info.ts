// @ts-ignore
import * as envinfo from 'envinfo';

export default async function () {
  const pkg = require('../../package.json');
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
      title: `jgb-cli v${pkg?.version} environment info`,
    }
  );
}
