import * as fs from 'fs-extra';
import getOptions from './options';

export default function generate(
  name: string,
  src: string,
  dest: string,
  done: (err: any) => void
) {
  const opts = getOptions(name, src);
  if (opts.status === false) {
    // Directly copy the project to dest.
    fs.copy(src, dest, err => {
      done(err);
    });
    return {};
  }
}
