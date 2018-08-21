import * as path from 'path';
import * as URL from 'url';

/**
 * Joins a path onto a URL, and normalizes Windows paths
 * e.g. from \path\to\res.js to /path/to/res.js.
 */
export default function(publicURL: string, assetPath: string) {
  const url = URL.parse(publicURL, false, true);
  const assetUrl = URL.parse(assetPath);
  url.pathname = path.posix.join(url.pathname, assetUrl.pathname);
  url.search = assetUrl.search;
  url.hash = assetUrl.hash;
  return URL.format(url);
}
