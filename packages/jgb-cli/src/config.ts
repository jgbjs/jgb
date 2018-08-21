import * as fs from 'fs';

export function loadConfig(fileName: string) {
  if (fs.existsSync(fileName)) {
    return require(fileName);
  }

  return null;
}
