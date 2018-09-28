import * as program from 'commander';
import * as pkg from '../package.json';
import { builder, clean, init } from './command';

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
  .option('-m, --minify', 'minify asset')
  .action(builder);

program
  .command('clean')
  .description('clean project dist and cache dir')
  .action(clean);

program
  .command('init <template-name> [project-name]')
  .usage('<template-name> [project-name]')
  .option('-c --clone', 'use git clone')
  .option('--offline', 'use cached template')
  .action(init);

program.parse(process.argv);

if (process.argv.indexOf('debug') >= 0) {
  builder([], {
    cache: false
  });
}
