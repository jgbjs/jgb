import chalk, { Chalk } from 'chalk';
import { Console } from 'console';
import WorkerFarm from './workerfarm/WorkerFarm';

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

  constructor() {
    this.chalk = new chalk.constructor({ enabled: true });
  }

  log(
    message: any,
    type: LogType | LogTypeColor = LogType.LOG,
    usedTime?: number
  ) {
    if (typeof message === 'object' || Array.isArray(message)) {
      message = JSON.stringify(message);
    }

    if (type === LogType.ERROR) {
      return console.error(chalk.red('[ERROR] ' + message));
    }

    if (type === LogType.WARNING) {
      return console.warn(chalk.yellow('[WARNING] ' + message));
    }

    if (type === LogType.INFO) {
      return console.info(chalk.blueBright('[INFO]') + ` ${message}`);
    }

    if (type === LogType.LOG) {
      return console.log(message);
    }

    const fn = this.getColorFn(type as LogTypeColor);
    const msg =
      fn(`[${type}] `) +
      message +
      ` ${usedTime ? chalk.gray(`[${usedTime}ms]`) : ''}`;

    process.stdout.write(msg + '\n');
    // console.log(msg);
  }

  warning(message: any) {
    this.log(message, LogType.WARNING);
  }

  error(message: any) {
    this.log(message, LogType.ERROR);
  }

  info(message: any) {
    this.log(message, LogType.INFO);
  }

  private getColorFn(type: LogTypeColor) {
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
        break;
    }

    cache.set(type, fn);

    return fn;
  }
}

let logger: any;

if (WorkerFarm.isWorker()) {
  // tslint:disable-next-line:max-classes-per-file
  class LoggerProxy {
    [method: string]: any;
  }
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
