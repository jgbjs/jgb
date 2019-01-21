import chalk from 'chalk';
import * as program from 'commander';
import * as pkg from '../package.json';
import { builder, clean, create, init } from './command';

program.version((pkg as any).version, '-v, --version');

program
  .command('build [input...]')
  .description('build project')
  .option(
    '-d, --out-dir <path>',
    'set the output directory. defaults to "dist"'
  )
  .option('--config <config>', 'jgb config path. defaults is "jgb.config.js"')
  .option('-w, --watch', 'setup watch mode')
  .option('-s, --source <source>', 'set the origin project type', /^(wx)$/)
  .option(
    '-t, --target <target>',
    'set the build type, either "wx", "aliapp" or "swan". defaults to "wx"',
    /^(wx|aliapp|swan|my)$/
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
  .option('--config <config>', 'jgb config path. defaults is "jgb.config.js"')
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

program
  .command('create <template-name> [folder-name]')
  .description('create new page or component from jgb_templates')
  .action(create)
  .usage('<template-name> [folder-name]')
  .option('-t,--template', 'create template files')
  .option('-c,--component', 'use component folder. default use page folder')
  .option('--config <config>', 'jgb config path. defaults is "jgb.config.js"')
  .on('--help', () => {
    console.log(' Example:');
    console.log();
    console.log(chalk.gray('   # downlown/create template files for use'));
    console.log(` $ jgb create template-name --template`);
    console.log();
    console.log(
      chalk.gray(
        '  # folder-name is relative to config.sourceDir. default is "src"'
      )
    );
    console.log(chalk.gray('  # use template files to create page files'));
    console.log(` $ jgb create template-name pages/home`);
    console.log(chalk.gray('  # or create component files'));
    console.log(
      ` $ jgb create template-name components/test-component --component`
    );
  });

program.parse(process.argv);
