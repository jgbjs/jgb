import chalk from 'chalk';
import * as crypto from 'crypto';
import * as downloadRepo from 'download-git-repo';
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import { logger } from 'jgb-shared/lib/Logger';
import * as path from 'path';
import * as rimraf from 'rimraf';
import * as tildify from 'tildify';
import * as home from 'user-home';
import checkVersion from '../utils/checkVersion';
import generate from '../utils/generate';

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
  const tmp = path.join(home, '.jgb_templates', md5(template));
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
      await downloadAndGenerate();
    }
  }

  async function downloadAndGenerate() {
    logger.info('downloading template ...');

    if (fs.existsSync(tmp)) {
      await new Promise(resolve => {
        rimraf(tmp, resolve);
      });
    }

    return new Promise(resolve => {
      logger.info(`template: ${template}`);
      downloadRepo(template, tmp, { clone }, async err => {
        if (err) {
          logger.error(
            'Failed to download repo ' + template + ': ' + err.message.trim()
          );
          return resolve();
        }
        await gen(tmp);
        resolve();
      });
    });
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

function isLocalPath(templatePath: string) {
  // templatePath example:
  // .jgb_templates
  // E:\workspace\jgb_templates\standard
  return /^[./]|(^[a-zA-Z]:)/.test(templatePath);
}

function getTemplatePath(templatePath: string) {
  return path.isAbsolute(templatePath)
    ? templatePath
    : path.normalize(path.join(process.cwd(), templatePath));
}

function md5(str: string) {
  const hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
}
