const platformFileReg = /\.\w+\.\w+$/;
const prjectConfigReg = /project\.\w+\.json$/;

export function isPlatformFile(file: string, target: string = '') {
  if (prjectConfigReg.test(file)) {
    return false;
  }

  return platformFileReg.test(file);
}
