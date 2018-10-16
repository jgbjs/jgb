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
  .action(clean);

program.parse(process.argv);
