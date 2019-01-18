import chalk from 'chalk';
import * as crypto from 'crypto';
import * as downloadRepo from 'download-git-repo';
import * as fs from 'fs';
import { logger } from 'jgb-shared/lib/Logger';

import * as path from 'path';
import * as rimraf from 'rimraf';
import * as home from 'user-home';

export async function downloadAndGenerate(
  template: string,
  tmp: string,
  clone: boolean = false
) {
  console.log(chalk.gray('downloading template ...'));

  if (fs.existsSync(tmp)) {
    await new Promise(resolve => {
      rimraf(tmp, resolve);
    });
  }

  return new Promise(resolve => {
    console.log(chalk.gray(`template: ${template}`));
    downloadRepo(template, tmp, { clone }, async err => {
      if (err) {
        logger.error(
          'Failed to download repo ' + template + ': ' + err.message.trim()
        );
        return resolve();
      }
      resolve();
    });
  });
}

/**
 * 生成MD5临时文件路径
 * @param template
 */
export function generateMD5TemplatePath(template: string) {
  return generateTemplatePath(md5(template));
}

/**
 * 生成临时文件路径
 * @param template
 */
export function generateTemplatePath(template: string) {
  return path.join(home, '.jgb_templates', template);
}

export function isLocalPath(templatePath: string) {
  // templatePath example:
  // .jgb_templates
  // E:\workspace\jgb_templates\standard
  return /^[./]|(^[a-zA-Z]:)/.test(templatePath);
}

/**
 * 获取临时文件路径
 * @param templatePath
 */
export function getTemplatePath(templatePath: string) {
  return path.isAbsolute(templatePath)
    ? templatePath
    : path.normalize(path.join(process.cwd(), templatePath));
}

export function md5(str: string) {
  const hash = crypto.createHash('md5');
  hash.update(str);
  return hash.digest('hex');
}
