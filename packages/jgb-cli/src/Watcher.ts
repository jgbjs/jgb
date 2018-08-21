import FSWatcher = require('fswatcher-child');
import * as Path from 'path';

/**
 * This watcher wraps chokidar so that we watch directories rather than individual files on macOS.
 * This prevents us from hitting EMFILE errors when running out of file descriptors.
 * Chokidar does not have support for watching directories on non-macOS platforms, so we disable
 * this behavior in order to prevent watching more individual files than necessary (e.g. node_modules).
 */
export default class Watcher {
  shouldWatchDirs: boolean;
  watcher: any;
  watchedDirectories = new Map();
  stopped = false;
  constructor() {
    // FS events on macOS are flakey in the tests, which write lots of files very quickly
    // See https://github.com/paulmillr/chokidar/issues/612
    this.shouldWatchDirs =
      process.platform === 'darwin' && process.env.NODE_ENV !== 'test';
    this.watcher = new FSWatcher({
      useFsEvents: this.shouldWatchDirs,
      ignoreInitial: true,
      ignorePermissionErrors: true,
      ignored: /\.cache|\.git/
    });
  }

  /**
   * Find a parent directory of `path` which is already watched
   */
  getWatchedParent(path: string) {
    path = Path.dirname(path);

    const root = Path.parse(path).root;
    while (path !== root) {
      if (this.watchedDirectories.has(path)) {
        return path;
      }

      path = Path.dirname(path);
    }

    return null;
  }

  /**
   * Find a list of child directories of `path` which are already watched
   */
  getWatchedChildren(path: string) {
    path = Path.dirname(path) + Path.sep;

    const res = [];
    for (const dir of this.watchedDirectories.keys()) {
      if (dir.startsWith(path)) {
        res.push(dir);
      }
    }

    return res;
  }

  /**
   * Add a path to the watcher
   */
  watch(path: string) {
    if (this.shouldWatchDirs) {
      // If there is no parent directory already watching this path, add a new watcher.
      const parent = this.getWatchedParent(path);
      if (!parent) {
        // Find watchers on child directories, and remove them. They will be handled by the new parent watcher.
        const children = this.getWatchedChildren(path);
        let count = 1;

        // tslint:disable-next-line:no-shadowed-variable
        for (const dir of children) {
          count += this.watchedDirectories.get(dir);
          this.watcher._closePath(dir);
          this.watchedDirectories.delete(dir);
        }

        const dir = Path.dirname(path);
        this.watcher.add(dir);
        this.watchedDirectories.set(dir, count);
      } else {
        // Otherwise, increment the reference count of the parent watcher.
        this.watchedDirectories.set(
          parent,
          this.watchedDirectories.get(parent) + 1
        );
      }
    } else {
      this.watcher.add(path);
    }
  }

  /**
   * Remove a path from the watcher
   */
  unwatch(path: string) {
    if (this.shouldWatchDirs) {
      const dir = this.getWatchedParent(path);
      if (dir) {
        // When the count of files watching a directory reaches zero, unwatch it.
        const count = this.watchedDirectories.get(dir) - 1;
        if (count === 0) {
          this.watchedDirectories.delete(dir);
          this.watcher.unwatch(dir);
        } else {
          this.watchedDirectories.set(dir, count);
        }
      }
    } else {
      this.watcher.unwatch(path);
    }
  }

  /**
   * Add an event handler
   */
  on(event: string, callback: () => any) {
    this.watcher.on(event, callback);
  }

  /**
   * Add an event handler
   */
  once(event: string, callback: () => any) {
    this.watcher.once(event, callback);
  }

  /**
   * Stop watching all paths
   */
  stop() {
    this.stopped = true;
    this.watcher.close();
  }
}
