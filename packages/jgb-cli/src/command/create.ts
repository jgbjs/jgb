import { logger } from '@jgbjs/shared/lib/Logger';
import { pathToUnixType } from '@jgbjs/shared/lib/utils';
import chalk from 'chalk';
import * as glob from 'fast-glob';
import * as fs from 'fs-extra';
import * as inquirer from 'inquirer';
import * as path from 'path';
import { getJGBConfig } from '../config';
import { downloadAndGenerate, generateTemplatePath, md5 } from '../utils/templateFile';
import beautify = require('js-beautify');


export default async function create(
  templateName: string,
  folderName: string,
  program: any = {}
) {
  const config = await getJGBConfig(program.config);

  if (program.list) {
    await showAllTemplate();
    return;
  }

  if (!templateName) {
    return logger.warning(`please enter [template-name]`);
  }

  // 是否创建模板
  const isCreateTemplate = !!program.template;
  // 创建模板
  if (isCreateTemplate) {
    await generateTemplate(templateName);
    return;
  }

  if (!config) {
    logger.warning(`cannot found jgb config file.`);
    return;
  }

  // 临时文件路径
  const tmp = generateTemplatePath(`template-${md5(templateName)}`);
  if (!fs.existsSync(tmp)) {
    return logger.warning(`cannot found template folder: ${templateName}`);
  }

  const useComponentFolder = !!program.component;
  const sourceDir = path.join(tmp, useComponentFolder ? 'component' : 'page');
  const distRootDir = path.join(process.cwd(), config.sourceDir || 'src');
  // folderName: pages/home, pages/home:home
  const [dir, fileName = 'index'] = folderName.split(':');
  const distDir = path.join(distRootDir, dir);
  fs.ensureDirSync(distDir);
  const outputDist = pathToUnixType(path.join(dir, fileName));
  if (fileName === 'index') {
    await fs.copy(sourceDir, distDir);
  } else {
    const files = await glob(`${sourceDir}/*`);
    const tasks = files.map((file: string) => {
      const basename = path.basename(file);
      const name = basename.replace(/index\./, `${fileName}.`);
      return fs.copy(file, path.join(distDir, name));
    });

    await Promise.all(tasks);
  }
  console.log(`${outputDist} has been created`);
}

/**
 * 生成模板文件
 * @param templateName
 * @param folderName
 */
export async function generateTemplate(templateName: string) {
  // mode: inline or online
  const mode = await getTemplateMode();
  let promise: ReturnType<typeof createOnlineTemplate>;

  switch (mode) {
    case 'online':
      promise = createOnlineTemplate(templateName);
      break;

    case 'inline':
    default:
      promise = createInlineTemplate(templateName);
      break;
  }

  const result = await promise;

  await addTemplateToAllTemplatess(result);
}

export async function addTemplateToAllTemplatess(result: {
  templateName: string;
  templatePath: string;
}) {
  const templateJsonPath = generateTemplatePath('.templates.json');
  const templateJson: any = await getAllTemplates();
  templateJson[result.templateName] = result.templatePath;

  await fs.writeFile(templateJsonPath, JSON.stringify(templateJson));
}

export async function getAllTemplates() {
  const templateJsonPath = generateTemplatePath('.templates.json');
  let templateJsonStr = '{}';
  let templateJson: any = {};
  try {
    templateJsonStr = await fs.readFile(templateJsonPath, 'utf-8');
    templateJson = JSON.parse(templateJsonStr);
  } catch (error) {
    console.log(error);
  }

  return templateJson;
}

export async function showAllTemplate() {
  const templateJson: any = await getAllTemplates();
  const keys = Object.keys(templateJson);
  if (!keys.length) {
    console.log('no list');
  }

  keys.forEach(key => {
    console.log(`${chalk.yellowBright(key)}`);
    console.log(`    ${chalk.gray(templateJson[key])}`);
  });
}

/**
 * 下载并创建在线模板文件
 * @param templateName
 */
export async function createOnlineTemplate(templateName: string) {
  const tmp = generateTemplatePath(`template-${md5(templateName)}`);
  console.log(
    chalk.gray(
      'you can find [template repository] info on https://github.com/flipxfx/download-git-repo'
    )
  );
  const answers = await makeQuestionAsync([
    {
      type: 'input',
      name: 'templateRepo',
      message: 'template repository'
    },
    {
      type: 'confirm',
      name: 'useClone',
      message: 'use git clone the repo?',
      default: true
    }
  ]);

  const { templateRepo, useClone } = answers;
  console.log(`> cached template at ${chalk.yellow(tmp)}`);
  await downloadAndGenerate(templateRepo, tmp, useClone);
  console.log(chalk.gray(`download repository ${templateRepo} success`));
  console.log('you can use command:');
  console.log(chalk.yellow(`  jgb create ${templateName} folder-name`));

  return {
    templateName,
    templatePath: tmp
  };
}

export async function createInlineTemplate(templateName: string) {
  const tmp = generateTemplatePath(`template-${md5(templateName)}`);

  const { files } = await makeQuestionAsync([
    {
      type: 'checkbox',
      message: 'pleace select choice for create template files',
      name: 'files',
      choices: ['js', 'wxss', 'json', 'wxml'].map(name => {
        return {
          name,
          checked: true
        };
      })
    }
  ]);

  const result = await createInlineFile(files);
  console.log(`> template at ${chalk.yellow(tmp)}`);
  fs.ensureDirSync(tmp);
  const tasks = result.map(({ code, filePath }) => {
    const fpath = path.join(tmp, filePath);
    const dir = path.parse(fpath).dir;
    fs.ensureDirSync(dir);
    return fs.writeFile(fpath, code);
  });
  await Promise.all(tasks);

  return {
    templateName,
    templatePath: tmp
  };
}

export async function createInlineFile(files: string[]) {
  const pageDir = 'page';
  const pageQuestions = files.map((ext: string) => {
    const filePath = `${pageDir}/index.${ext}`;
    return {
      ext,
      filePath,
      type: 'editor',
      name: `${pageDir}-${ext}`,
      message: `${filePath} :`
    };
  });

  const componentDir = 'component';
  const componentQuestions = files.map((ext: string) => {
    const filePath = `${componentDir}/index.${ext}`;
    return {
      ext,
      filePath,
      type: 'editor',
      name: `${componentDir}-${ext}`,
      message: `${filePath} :`
    };
  });

  const result = await makeQuestionAsync(
    pageQuestions.concat(componentQuestions).reduce((arr, question) => {
      const name = `${question.name}-filePath`;
      const { ext } = question;
      const q = {
        name,
        type: 'input',
        message: 'are you sure this file path ?',
        default: question.filePath,
        when(answers: any) {
          const code = answers[question.name];
          const beautifyCode = autoBeautify(code, ext);
          console.log(chalk.grey(beautifyCode));
          console.log(`> will write file: ${chalk.yellow(question.filePath)}`);
          return true;
        }
      };
      return arr.concat([question, q]);
    }, [])
  );

  const keys = Object.keys(result);
  const results = keys.reduce((arr, key, idx) => {
    const carr = (idx % 2 === 0 ? [] : arr[arr.length - 1]) || [];
    carr.push(key);
    if (carr.length === 1) {
      arr.push(carr);
    }
    return arr;
  }, []);

  return results.map(r => {
    const [codeKey, filePathKey] = r;
    const code = result[codeKey];
    const filePath = result[filePathKey];
    return {
      code,
      filePath
    };
  });
}

function autoBeautify(code: string, ext = 'js') {
  try {
    switch (ext) {
      case 'css':
        return beautify.css(code);
      case 'wxml':
        return beautify.html(code);
      case 'json':
        return JSON.stringify(JSON.parse(code || '{}'), null, 2);
      case 'js':
      default:
        return beautify(code);
    }
  } catch (error) {
    return code;
  }
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
  return inquirer.prompt(questions);
}
