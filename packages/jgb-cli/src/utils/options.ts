import fs = require('fs');
import path = require('path');
import metadata = require('read-metadata');
import validateName = require('validate-npm-package-name');
import getGitUser from './git-user';

export default function(name: string, dir: string) {
  const opts = getMetadata(dir);
  setDefault(opts, 'name', name);
  setValidateName(opts)

  const author = getGitUser();
  if (author) {
    setDefault(opts, 'author', author);
  }

  return opts;
}

/**
 * Gets the metadata from either a meta.json or meta.js file.
 *
 * @param  {String} dir
 * @return {Object}
 */

function getMetadata(dir: string) {
  const json = path.join(dir, 'meta.json');
  const js = path.join(dir, 'meta.js');
  let opts: any = {};
  opts.status = true;

  if (fs.existsSync(json)) {
    opts = metadata.sync(json);
  } else if (fs.existsSync(js)) {
    const req = require(path.resolve(js));
    if (req !== Object(req)) {
      throw new Error('meta.js needs to expose an object');
    }
    opts = req;
  } else {
    opts.status = false;
  }

  return opts;
}

/**
 * Set the default value for a prompt question
 *
 * @param {Object} opts
 * @param {String} key
 * @param {String} val
 */

function setDefault(opts: any, key: string, val: any) {
  if (opts.schema) {
    opts.prompts = opts.schema;
    delete opts.schema;
  }
  const prompts = opts.prompts || (opts.prompts = {});
  if (!prompts[key] || typeof prompts[key] !== 'object') {
    prompts[key] = {
      type: 'string',
      default: val
    };
  } else {
    prompts[key].default = val;
  }
}

function setValidateName(opts: any) {
  const name = opts.prompts.name;
  const customValidate = name.validate;
  // tslint:disable-next-line:no-shadowed-variable
  name.validate = (name: string) => {
    const its = validateName(name);
    if (!its.validForNewPackages) {
      const errors = (its.errors || []).concat(its.warnings || []);
      return 'Sorry, ' + errors.join(' and ') + '.';
    }
    if (typeof customValidate === 'function') {
      return customValidate(name);
    }
    return true;
  };
}
