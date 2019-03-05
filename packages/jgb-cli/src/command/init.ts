import { logger } from '@jgbjs/shared/lib/Logger';
import chalk from 'chalk';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import * as path from 'path';
import * as tildify from 'tildify';
import checkVersion from '../utils/checkVersion';
import generate from '../utils/generate';
import { downloadAndGenerate, generateMD5TemplatePath, getTemplatePath, isLocalPath } from '../utils/templateFile';

export default async function init(
  template: string,
  rawName: string,
  program: any
) {
  const inPlace = !rawName || rawName === '.';
  const name = inPlace ? path.relative('../', process.cwd()) : rawName;
  const to = path.resolve(rawName || '.');
  const clone = program.clone || false;
  const offline = program.offline || false;
  const tmp = generateMD5TemplatePath(template);
  /**
   * use offline cache
   */
  if (offline) {
    console.log(`> Use cached template at ${chalk.yellow(tildify(tmp))}`);
    template = tmp;
  }

  if (fs.existsSync(to)) {
    inquirer
      .prompt([
        {
          type: 'confirm',
          message: inPlace
            ? 'Generate project in current directory?'
            : 'Target directory exists. Continue?',
          name: 'ok'
        }
      ])
      .then(async (answers: any) => {
        if (answers.ok) {
          await run();
        }
      })
      .catch();
  } else {
    await run();
  }

  async function run() {
    if (isLocalPath(template)) {
      const templatePath = getTemplatePath(template);
      if (fs.existsSync(templatePath)) {
        await gen(templatePath);
      } else {
        logger.warning(`Local template "${template}" not found.`);
      }
    } else {
      await checkVersion();
      await downloadAndGenerate(template, tmp, clone);
      await gen(tmp);
    }
  }

  async function gen(templatePath: string) {
    generate(name, templatePath, to, err => {
      if (err) {
        logger.error(err);
      }
      console.log();
      logger.info(`Generated "${name}".`);
    });
  }
}
