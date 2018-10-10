import * as program from 'commander';
import { Config, IInitOptions } from 'jgb-shared/lib';
import * as rimraf from 'rimraf';
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
  .option('-s, --source <source>', 'set the origin project type', /^(wx)$/)
  .option(
    '-t, --target <target>',
    'set the build type, either "wx", "my" or "swan". defaults to "wx"',
    /^(wx|my|swan)$/
  )
  .option('--no-cache', 'set this build system do not use cache')
  .option('--cache-dir <path>', 'set the cache directory. defaults to ".cache"')
  .option('-m, --minify', 'minify asset')
  .action(builder);

program
  .command('clean')
  .description('clean project dist and cache dir')
  .action(async () => {
    const config = (await Config.load(process.cwd(), [
      'jgb.config.js'
    ])) as IInitOptions;

    if (!config) {
      return;
    }

    const cacheDir = config.cacheDir || '.cache';
    const distDir = config.outDir || 'dist';

    console.log(`clean [${cacheDir}], [${distDir}] ...`);

    const rmCachePromise = new Promise(resolve => rimraf(cacheDir, resolve));
    const rmDistPromise = new Promise(resolve => rimraf(distDir, resolve));
    await Promise.all([rmCachePromise, rmDistPromise]);
  });

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

if (process.argv.indexOf('debug') >= 0) {
  builder([], {
    cache: false
  });
}
