const platformFileReg = /\w+\.\w+\.\w+/;

export function isPlatformFile(file: string) {
  return platformFileReg.test(file);
}
