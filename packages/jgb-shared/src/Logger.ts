import chalk, { Chalk } from 'chalk';
import ora = require('ora');
import WorkerFarm from './workerfarm/WorkerFarm';

import readline = require('readline');
import stripAnsi = require('strip-ansi');

export type LogTypeColor = '编译';

export enum LogType {
  WARNING,
  ERROR,
  INFO,
  LOG
}

export default class Logger {
  chalk: Chalk;
  cache = new Map();
  logLevel: number;
  spinner: ora.Ora;
  lines = 0;

  constructor(options = {}) {
    this.chalk = new chalk.constructor({ enabled: true });
    this.setOptions(options);
  }

  setOptions(options: any = {}) {
    const logLevel = options.logLevel ?? process.env.JGB_LOG_LEVEL;
    this.logLevel = isNaN(logLevel) === false ? Number(logLevel) : 3;
  }

  countLines(message) {
    return stripAnsi(message)
      .split('\n')
      .reduce((p, line) => {
        if (process.stdout.columns) {
          return p + Math.ceil((line.length || 1) / process.stdout.columns);
        }

        return p + 1;
      }, 0);
  }

  log(
    message: any,
    type: LogType | LogTypeColor = LogType.LOG,
    usedTime?: number
  ) {
    if (this.logLevel < 3) {
      return;
    }

    if (typeof type === 'string') {
      const fn = this.getColorFn(type as LogTypeColor);
      const msg =
        fn(`[${type}] `) +
        message +
        ` ${usedTime ? chalk.gray(`[${usedTime}ms]`) : ''}`;

      this.write(msg);
    } else {
      let colorFn = chalk.blueBright;
      if (type === LogType.ERROR) {
        colorFn = chalk.red;
      }

      if (type === LogType.WARNING) {
        colorFn = chalk.yellow;
      }
      this.write(colorFn(message));
    }
  }

  warning(message: any) {
    if (this.logLevel < 2) {
      return;
    }
    this.log(message, LogType.WARNING);
  }

  error(message: any) {
    if (this.logLevel < 1) {
      return;
    }
    this.log(message, LogType.ERROR);
  }

  info(message: any) {
    if (this.logLevel < 3) {
      return;
    }
    this.log(message, LogType.INFO);
  }

  private getColorFn(type: LogTypeColor | number) {
    const cache = this.cache;

    if (cache.has(type)) {
      return cache.get(type);
    }

    let fn;

    switch (type) {
      case '编译':
        fn = chalk.keyword('blue');
        break;

      default:
        fn = chalk.keyword('gray');
        break;
    }

    cache.set(type, fn);

    return fn;
  }

  clear() {
    if (this.logLevel > 3) {
      return;
    }

    while (this.lines > 0) {
      readline.clearLine(process.stdout, 0);
      readline.moveCursor(process.stdout, 0, -1);
      this.lines--;
    }

    readline.cursorTo(process.stdout, 0);
    this.stopSpinner();
  }

  writeRaw(message) {
    this.stopSpinner();

    this.lines += this.countLines(message) - 1;
    process.stdout.write(message);
  }

  write(message, persistent = false) {
    if (this.logLevel > 3) {
      return this.verbose(message);
    }

    if (!persistent) {
      this.lines += this.countLines(message);
    }

    this.stopSpinner();
    this._log(message);
  }

  progress(message) {
    // if (this.logLevel < 3) {
    //   return;
    // }

    if (this.logLevel > 3) {
      return this.verbose(message);
    }

    const styledMessage = this.chalk.gray.bold(message);
    if (!this.spinner) {
      this.spinner = ora({
        text: styledMessage,
        stream: process.stdout
      }).start();
    } else {
      this.spinner.text = styledMessage;
    }
  }

  verbose(message) {
    if (this.logLevel < 4) {
      return;
    }

    const currDate = new Date();
    message = `[${currDate.toLocaleTimeString()}]: ${message}`;
    this._log(message);
  }

  stopSpinner() {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }

  _log(message) {
    console.log(message);
  }
}

// tslint:disable-next-line:max-classes-per-file
class LoggerProxy {
  [method: string]: any;
}

let logger: Logger | LoggerProxy;

if (WorkerFarm.isWorker()) {
  for (const method of Object.getOwnPropertyNames(Logger.prototype)) {
    LoggerProxy.prototype[method] = (...args: any[]) => {
      WorkerFarm.callMaster(
        {
          location: __filename,
          method,
          args
        },
        false
      );
    };
  }

  logger = new LoggerProxy();
} else {
  logger = new Logger();
}

const log = logger.log.bind(logger);
const info = logger.info.bind(logger);
const warning = logger.warning.bind(logger);
const error = logger.error.bind(logger);

export { logger, log, info, warning, error };
