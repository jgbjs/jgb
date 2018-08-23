import * as program from 'commander';
import { Config, IInitOptions } from 'jgb-shared/lib';
import * as pkg from '../package.json';
import Core from './core';

program.version((pkg as any).version, '-v, --version');

program
  .command('build [input...]')
  .description('build project')
  .option(
    '-d, --out-dir <path>',
    'set the output directory. defaults to "dist"'
  )
  .option('-w, --watch', 'setup watch mode')
  .option(
    '-t, --target <target>',
    'set the build type, either "weapp", "aliapp" or "baidu". defaults to "weapp"',
    /^(weapp|aliapp|baidu)$/
  )
  .option('--no-cache', 'set this build system do not use cache')
  .option('--cache-dir <path>', 'set the cache directory. defaults to ".cache"')
  .action(builder);

program.parse(process.argv);

async function builder(main: any = [], command: any = {}) {
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

if (process.argv.indexOf('build') === -1) {
  builder([], {
    cache: false
  });
}
