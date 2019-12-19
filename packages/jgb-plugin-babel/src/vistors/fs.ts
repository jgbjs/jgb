import template = require('babel-template');
import * as t from 'babel-types';
import * as fs from 'fs';
import { logger } from 'jgb-shared/lib/Logger';
import * as Path from 'path';

const bufferTemplate = template('Buffer.from(CONTENT, ENC)');

export default {
  AssignmentExpression(path) {
    if (!isRequire(path.node.right, 'fs', 'readFileSync')) {
      return;
    }

    // tslint:disable-next-line: forin
    for (const name in path.getBindingIdentifiers()) {
      const binding = path.scope.getBinding(name);
      if (!binding) {
        continue;
      }

      binding.path.setData('__require', path.node);
    }
  },

  CallExpression(path, asset) {
    if (referencesImport(path, 'fs', 'readFileSync')) {
      const vars = {
        __dirname: Path.dirname(asset.name),
        __filename: asset.basename
      };
      let filename, args, res;

      try {
        [filename, ...args] = path
          .get('arguments')
          .map(arg => evaluate(arg, vars));

        filename = Path.resolve(filename);
        res = fs.readFileSync(filename, ...args);
      } catch (err) {
        if ((err instanceof NodeNotEvaluatedError) as any) {
          // Warn using a code frame
          err.fileName = asset.name;
          asset.generateErrorMessage(err);
          logger.warning(err);
          return;
        }

        // Add location info so we log a code frame with the error
        err.loc =
          path.node.arguments.length > 0
            ? path.node.arguments[0].loc.start
            : path.node.loc.start;
        throw err;
      }

      let replacementNode;
      if (Buffer.isBuffer(res)) {
        replacementNode = bufferTemplate({
          CONTENT: t.stringLiteral(res.toString('base64')),
          ENC: t.stringLiteral('base64')
        });
      } else {
        replacementNode = t.stringLiteral(res);
      }

      asset.addDependency(filename, {
        includedInParent: true
      });
      path.replaceWith(replacementNode);
      asset.isAstDirty = true;
    }
  }
};
function isRequire(node: any, name, method) {
  // e.g. require('fs').readFileSync
  // @ts-ignore
  if (t.isMemberExpression(node) && node.property.name === method) {
    node = node.object;
  }

  if (!t.isCallExpression(node)) {
    return false;
  }

  const { callee, arguments: args } = node;
  const isRequire =
    t.isIdentifier(callee) &&
    callee.name === 'require' &&
    args.length === 1 &&
    t.isStringLiteral(args[0]);

  if (!isRequire) {
    return false;
  }

  // @ts-ignore
  if (name && args[0].value !== name) {
    return false;
  }

  return true;
}

function referencesImport(path, name, method) {
  const callee = path.node.callee;
  let bindingPath;

  // e.g. readFileSync()
  if (t.isIdentifier(callee)) {
    bindingPath = getBindingPath(path, callee.name);
  } else if (t.isMemberExpression(callee)) {
    // @ts-ignore
    if (callee.property.name !== method) {
      return false;
    }

    // e.g. fs.readFileSync()
    if (t.isIdentifier(callee.object)) {
      bindingPath = getBindingPath(path, callee.object.name);

      // require('fs').readFileSync()
      // @ts-ignore
    } else if (isRequire(callee.object, name)) {
      return true;
    }
  } else {
    return false;
  }

  if (!bindingPath) {
    return;
  }

  const bindingNode = bindingPath.getData('__require') || bindingPath.node;
  const parent = bindingPath.parentPath;

  // e.g. import fs from 'fs';
  if (parent.isImportDeclaration()) {
    if (
      bindingPath.isImportSpecifier() &&
      bindingPath.node.imported.name !== method
    ) {
      return false;
    }

    return parent.node.source.value === name;

    // e.g. var fs = require('fs');
  } else if (
    t.isVariableDeclarator(bindingNode) ||
    t.isAssignmentExpression(bindingNode)
  ) {
    // @ts-ignore
    const left = bindingNode.id || bindingNode.left;
    // @ts-ignore
    const right = bindingNode.init || bindingNode.right;

    // e.g. var {readFileSync} = require('fs');
    if (t.isObjectPattern(left)) {
      // @ts-ignore
      const prop = left.properties.find(p => p.value.name === callee.name);
      // @ts-ignore
      if (!prop || prop.key.name !== method) {
        return false;
      }
    } else if (!t.isIdentifier(left)) {
      return false;
    }

    return isRequire(right, name, method);
  }

  return false;
}

function getBindingPath(path, name) {
  const binding = path.scope.getBinding(name);
  return binding && binding.path;
}

function NodeNotEvaluatedError(node) {
  this.message = 'Cannot statically evaluate fs argument';
  this.node = node;
  this.loc = node.loc.start;
}

function evaluate(path, vars) {
  // Inline variables
  path.traverse({
    Identifier(ident) {
      const key = ident.node.name;
      if (key in vars) {
        ident.replaceWith(t.valueToNode(vars[key]));
      }
    }
  });

  const res = path.evaluate();

  if (!res.confident) {
    throw new NodeNotEvaluatedError(path.node);
  }

  return res.value;
}
