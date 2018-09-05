export function resolveQuery(
  query: string,
  extraQuery: any = {},
  // tslint:disable-next-line:variable-name
  _parseQuery: any
): any {
  const parse = _parseQuery || parseQuery;
  let parsedQuery;
  try {
    parsedQuery = parse(query || '');
  } catch (e) {
    parsedQuery = {};
  }
  // tslint:disable-next-line:forin
  for (const key in extraQuery) {
    parsedQuery[key] = extraQuery[key];
  }
  return parsedQuery;
}

function parseQuery(query: string): any {
  const res: any = {};

  query = query.trim().replace(/^(\?|#|&)/, '');

  if (!query) {
    return res;
  }

  query.split('&').forEach(param => {
    const parts = param.replace(/\+/g, ' ').split('=');
    const key = parts.shift();
    const val = parts.length > 0 ? parts.join('=') : null;

    if (res[key] === undefined) {
      res[key] = val;
    } else if (Array.isArray(res[key])) {
      res[key].push(val);
    } else {
      res[key] = [res[key], val];
    }
  });

  return res;
}

export function stringifyQuery(obj: any): string {
  const res = obj
    ? Object.keys(obj)
        .map(key => {
          const val = obj[key];

          if (val === undefined) {
            return '';
          }

          if (val === null) {
            return key;
          }

          if (Array.isArray(val)) {
            const result: any[] = [];
            val.forEach(val2 => {
              if (val2 === undefined) {
                return;
              }
              if (val2 === null) {
                result.push(key);
              } else {
                result.push(`${key}=${val2}`);
              }
            });
            return result.join('&');
          }

          return `${key}=${val}`;
        })
        .filter(x => x.length > 0)
        .join('&')
    : null;
  return res ? `?${res}` : '';
}
