// tslint:disable-next-line:ordered-imports
import { Asset, IInitOptions, Resolver, Utils } from 'jgb-shared/lib';
import { pathToUnixType } from 'jgb-shared/lib/utils';
import { extname } from 'path';
import * as render from 'posthtml-render';
import * as api from 'posthtml/lib/api';
import htmlnanoTransform from './htmlnano';
import { parse, transform } from './posthtml';

// A list of all attributes that may produce a dependency
// Based on https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes
const ATTRS: {
  [key: string]: any;
} = {
  src: [
    'script',
    'img',
    'audio',
    'video',
    'source',
    'track',
    'iframe',
    'embed',
    // weapp： https://developers.weixin.qq.com/miniprogram/dev/framework/view/wxml/import.html
    'image',
    'import',
    'include',
    'wxs'
  ],
  href: ['link', 'a', 'use'],
  srcset: ['img', 'source'],
  poster: ['video'],
  'xlink:href': ['use'],
  content: ['meta'],
  data: ['object']
};

// A list of metadata that should produce a dependency
// Based on:
// - http://schema.org/
// - http://ogp.me
// - https://developer.twitter.com/en/docs/tweets/optimize-with-cards/overview/markup
// - https://msdn.microsoft.com/en-us/library/dn255024.aspx
const META: {
  [key: string]: any;
} = {
  property: [
    'og:image',
    'og:image:url',
    'og:image:secure_url',
    'og:audio',
    'og:audio:secure_url',
    'og:video',
    'og:video:secure_url'
  ],
  name: [
    'twitter:image',
    'msapplication-square150x150logo',
    'msapplication-square310x310logo',
    'msapplication-square70x70logo',
    'msapplication-wide310x150logo',
    'msapplication-TileImage'
  ],
  itemprop: [
    'image',
    'logo',
    'screenshot',
    'thumbnailUrl',
    'contentUrl',
    'downloadUrl'
  ]
};

// Options to be passed to `addURLDependency` for certain tags + attributes
const OPTIONS: {
  [key: string]: any;
} = {
  a: {
    href: { entry: true }
  },
  iframe: {
    src: { entry: true }
  }
};

const enableEmptyAttrs = ['class'];

export default class HtmlAsset extends Asset {
  constructor(fileName: string, options: IInitOptions) {
    super(fileName, options);
  }

  static outExt = '.html';

  async parse(code: string): Promise<any> {
    const res = await parse(code, this);
    res.walk = api.walk;
    res.match = api.match;
    return res;
  }

  async processSingleDependency(path: string, opts: any) {
    let assetPath = this.addURLDependency(path, opts);
    if (!Utils.isUrl(assetPath)) {
      if (this.options.publicURL) {
        assetPath = Utils.urlJoin(this.options.publicURL, assetPath);
      }

      const ext = extname(assetPath);

      if (HtmlAsset.outExt !== ext) {
        const resolver = this.options.parser.resolver as Resolver;
        const { path: depPath } = await resolver.resolve(assetPath, this.name);
        const depAsset: Asset = this.options.parser.getAsset(depPath);
        if (depAsset instanceof HtmlAsset) {
          // .wxml => .swan
          // .wxs => .filter.js
          const depDistPath = depAsset.generateDistPath(
            assetPath,
            HtmlAsset.outExt
          );
          const depExt = extname(depDistPath);
          if (depExt !== ext) {
            assetPath = assetPath.replace(ext, depExt);
          }
        }
      }
    }
    return assetPath;
  }

  async collectSrcSetDependencies(srcset: string, opts: any) {
    const newSources = [];
    for (const source of srcset.split(',')) {
      const pair = source.trim().split(' ');
      if (pair.length === 0) {
        continue;
      }
      pair[0] = await this.processSingleDependency(pair[0], opts);
      newSources.push(pair.join(' '));
    }
    return newSources.join(',');
  }

  getAttrDepHandler(attr: string) {
    if (attr === 'srcset') {
      return this.collectSrcSetDependencies;
    }
    return this.processSingleDependency;
  }

  async collectDependencies() {
    const { ast } = this;

    // Add bundled dependencies from plugins like posthtml-extend or posthtml-include, if any
    if (ast.messages) {
      ast.messages.forEach((message: any) => {
        if (message.type === 'dependency') {
          this.addDependency(message.file, {
            includedInParent: true
          });
        }
      });
    }

    const asyncTasks: Array<Promise<any>> = [];

    ast.walk((node: any) => {
      if (!node) {
        return node;
      }
      if (node.attrs) {
        const task = async () => {
          // if (node.tag === 'meta') {
          //   if (
          //     !Object.keys(node.attrs).some((attr: any) => {
          //       const values = META[attr];
          //       return values && values.includes(node.attrs[attr]);
          //     })
          //   ) {
          //     return node;
          //   }
          // }

          // tslint:disable-next-line:forin
          for (const attr of Object.keys(node.attrs)) {
            const elements = ATTRS[attr];
            // Check for virtual paths
            if (node.tag === 'a' && node.attrs[attr].lastIndexOf('.') < 1) {
              continue;
            }

            const nodeValue: string = node.attrs[attr];

            // wx:else do not transform to  wx:else=""
            if (!enableEmptyAttrs.includes(attr) && nodeValue === '') {
              node.attrs[attr] = true;
            }

            if (elements && elements.includes(node.tag)) {
              const depHandler = this.getAttrDepHandler(attr);
              const options = OPTIONS[node.tag];
              // vue like bind data or base64
              if (nodeValue.includes('{{') || nodeValue.startsWith('data:')) {
                continue;
              }
              const depPath = await depHandler.call(
                this,
                node.attrs[attr],
                options && options[attr]
              );
              node.attrs[attr] = pathToUnixType(depPath);
              // this.isAstDirty = true;
            }
          }
        };
        asyncTasks.push(task());
      }

      return node;
    });

    await Promise.all(asyncTasks);
  }

  async pretransform() {
    await transform(this);
  }

  async transform() {
    if (this.options.minify) {
      await htmlnanoTransform(this);
    }
  }

  async generate() {
    return {
      code: render(this.ast, {
        singleTags: [
          'icon',
          'image',
          'progress',
          'checkbox',
          'slider',
          'radio',
          'switch',
          'wxs'
        ],
        closingSingleTag: 'slash'
      }),
      ext: HtmlAsset.outExt
    };
  }
}
