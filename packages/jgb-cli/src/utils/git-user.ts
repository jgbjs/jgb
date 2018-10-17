import * as childProcess from 'child_process';

const execSync = childProcess.execSync;

export default function getGitUser() {
  let name;
  let email;

  try {
    name = execSync('git config --get user.name');
    email = execSync('git config --get user.email');
  } catch (e) {
    // ignore error
  }

  name = name && name.toString().trim();
  email = email && ' <' + email.toString().trim() + '>';
  return (name || '') + (email || '');
}
