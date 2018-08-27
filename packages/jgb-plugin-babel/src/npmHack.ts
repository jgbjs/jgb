export default function(filename: string, code: string) {
  // 一些库（redux等） 可能会依赖 process.env.NODE_ENV 进行逻辑判断
  // 这里在编译这一步直接做替换 否则报错
  code = code.replace(
    /process\.env\.NODE_ENV/g,
    JSON.stringify(process.env.NODE_ENV)
  );
  switch (filename) {
    case 'lodash.js':
    case '_global.js':
      code = code
        .replace("Function('return this')()", 'this')
        .replace('this', 'this || {}');
      break;
    case '_html.js':
      code = 'module.exports = false;';
      break;
    case '_microtask.js':
      code = code.replace('if(Observer)', 'if(false && Observer)');
      // IOS 1.10.2 Promise BUG
      code = code.replace(
        'Promise && Promise.resolve',
        'false && Promise && Promise.resolve'
      );
      break;
    case '_freeGlobal.js':
      code = code.replace(
        'module.exports = freeGlobal;',
        'module.exports = freeGlobal || this || {};'
      );
      break;
    case '_typed-buffer.js':
      code = code.replace('var Math = global.Math', '');
      break;
    case 'now.js':
      code = code.replace('root.Date.now', 'Date.now');
      break;
  }
  return code;
}
