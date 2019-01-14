import * as fs from 'fs-extra';
import * as inquirer from 'inquirer';
import { Config, IInitOptions } from 'jgb-shared/lib';
import { logger } from 'jgb-shared/lib/Logger';
import chalk from 'jgb-shared/node_modules/chalk';
import * as path from 'path';
import tildify = require('tildify');
import {
  downloadAndGenerate,
  generateMD5TemplatePath
} from '../utils/templateFile';

export default async function create(
  templateName: string,
  folderName: string,
  program: any = {}
) {
  const config = (await Config.load(process.cwd(), [
    'jgb.config.js'
  ])) as IInitOptions;

  if (!config) {
    return;
  }

  const isCreateTemplate = !!program.template;
  if (isCreateTemplate) {
    if (!folderName) {
      console.log();
      logger.warning(' 缺少folderName参数.');
      console.log();
      console.log(`Example:`);
      console.log();
      console.log(`    jgb create custom-page-name folder-name --template`);
      return;
    }
    await generateTemplate(templateName);
    return;
  }
}

/**
 * 生成模板文件
 * @param templateName
 * @param folderName
 */
async function generateTemplate(templateName: string) {
  // mode: inline or online
  const mode = await getTemplateMode();
  switch (mode) {
    case 'online':
      await createOnlineTemplate(templateName);
      break;

    default:
      break;
  }
}

async function createOnlineTemplate(templateName: string) {
  const tmp = generateMD5TemplatePath(`temp-${templateName}`);
  console.log(
    chalk.gray(
      'you can find params on https://github.com/flipxfx/download-git-repo'
    )
  );
  const answers = await makeQuestionAsync([
    {
      type: 'input',
      name: 'templateRepo',
      message: 'template repo name'
    },
    {
      type: 'confirm',
      name: 'useClone',
      message: 'use git clone the repo?',
      default: true
    }
  ]);

  const { templateRepo, useClone } = answers;
  console.log(`> Use cached template at ${chalk.yellow(tildify(tmp))}`);
  await downloadAndGenerate(templateRepo, tmp, useClone);

  console.log(answers, tmp);
}

async function createInlineTemplate(templateName: string) {
  const tmp = generateMD5TemplatePath(`temp-${templateName}`);
  const answers = await makeQuestionAsync(['js', 'wxss', 'json', 'wxml']);
}

function copyAsync(src: string, dest: string) {
  // Directly copy the project to dest.
  return new Promise(done =>
    // source/page/ => dest
    fs.copy(path.join(src, 'page'), dest, (err: any) => {
      done(err);
    })
  );
}

function getTemplateMode(): Promise<'inline' | 'online'> {
  return makeQuestionAsync([
    {
      type: 'list',
      message: 'pleace select choice for create template mode',
      name: 'onlineOrinline',
      choices: ['inline', 'online']
    }
  ]).then(res => res.onlineOrinline);
}

function makeQuestionAsync(questions: any[]): Promise<any> {
  return new Promise(resolve => inquirer.prompt(questions).then(resolve));
}
