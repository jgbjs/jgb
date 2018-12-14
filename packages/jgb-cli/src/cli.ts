import chalk from 'chalk';
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
    'set the build type, either "wx", "aliapp" or "swan". defaults to "wx"',
    /^(wx|aliapp|swan)$/
  )
  .option('--no-cache', 'set this build system do not use cache')
  .option('--cache-dir <path>', 'set the cache directory. defaults to ".cache"')
  .option('-m, --minify', 'minify asset')
  .action(builder)
  .on('--help', () => {
    console.log();
    console.log('  Example:');
    console.log();
    console.log(chalk.gray('   # build with watch'));
    console.log('  $ jgb build --watch');
    console.log();
    console.log(
      chalk.gray(
        '   # build without cache (default with cache in [.cache] folder)'
      )
    );
    console.log('  $ jgb build --no-cache');
    console.log();
  });

program
  .command('clean')
  .description('clean project dist and cache dir')
  .action(clean);

program
  .command('init <template-name> [project-name]')
  .description('generate a new project from a template')
  .action(init)
  .usage('<template-name> [project-name]')
  .option('-c --clone', 'use git clone')
  .option('--offline', 'use cached template')
  .on('--help', () => {
    console.log(
      '  <template-name> rule please follow https://github.com/flipxfx/download-git-repo'
    );
    console.log();
    console.log('  Example:');
    console.log();
    console.log(
      chalk.gray('   # create a new project from gitlab with custom origin')
    );
    console.log(
      '  $ jgb init gitlab:mygitlab.com:flipxfx/download-git-repo-fixture#my-branch'
    );
    console.log();
    console.log(
      chalk.gray('   # create a new project straight from a github template')
    );
    console.log('  $ jgb init username/repo my-project');
    console.log();
  });

program.parse(process.argv);
