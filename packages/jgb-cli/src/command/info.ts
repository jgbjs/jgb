// @ts-ignore
import * as envinfo from 'envinfo';
import { Config } from 'jgb-shared/lib';

export default async function() {
  const pkg = await Config.load(process.cwd(), ['package.json']);

  const npmPackages = []
    .concat(Object.keys(pkg.dependencies), Object.keys(pkg.devDependencies))
    .filter(key => key.includes('jgb-'));

  envinfo.run(
    Object.assign(
      {},
      {
        System: ['OS', 'Shell'],
        Binaries: ['Node', 'Yarn', 'npm'],
        npmPackages,
        npmGlobalPackages: ['typescript']
      }
    ),
    {
      console: true,
      title: `jgb-cli ${pkg.version} environment info`
    }
  );
}
