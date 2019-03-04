import { log } from '../Logger';
const spawn = require('cross-spawn');

function pipeSpawn(cmd, params, opts) {
  const cp = spawn(
    cmd,
    params,
    Object.assign(
      {
        env: Object.assign(
          {
            FORCE_COLOR: '#fff',
            npm_config_color: 'always',
            npm_config_progress: true
          },
          process.env,
          { NODE_ENV: null } // Passing NODE_ENV through causes strange issues with yarn
        )
      },
      opts
    )
  );

  cp.stdout.setEncoding('utf8').on('data', d => log(d));
  cp.stderr.setEncoding('utf8').on('data', d => log(d));

  return new Promise((resolve, reject) => {
    cp.on('error', reject);
    cp.on('close', function(code) {
      if (code !== 0) {
        return reject(new Error(cmd + ' failed.'));
      }

      return resolve();
    });
  });
}

export default pipeSpawn;
