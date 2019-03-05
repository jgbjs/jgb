import { Asset, IInitOptions, Resolver } from '@jgbjs/shared/lib';
import * as path from 'path';
import * as postcss from 'postcss';
import * as valueParser from 'postcss-value-parser';
import CSSAst from './CSSAst';
import postcssTransform from './postcss';

const URL_RE = /url\s*\("?(?![a-z]+:)/;
const IMPORT_RE = /@import/;
const PROTOCOL_RE = /^[a-z]+:/;

export default class CssAsset extends Asset {
  static outExt = '.css';
  cssModules: any;

  constructor(name: string, options: IInitOptions) {
    super(name, options);
  }

  mightHaveDependencies() {
    return (
      !/\.css$/.test(this.name) ||
      IMPORT_RE.test(this.contents) ||
      URL_RE.test(this.contents)
    );
  }

  async parse(code: string) {
    const root = postcss.parse(code, { from: this.name, to: this.name });
    return new CSSAst(code, root);
  }

  async collectDependencies() {
    const asyncTasks: Array<Promise<any>> = [];

    this.ast.root.walkAtRules('import', (rule: any) => {
      const params = valueParser(rule.params);
      let [name, ...media] = params.nodes;
      let dep: string;
      if (
        name.type === 'function' &&
        name.value === 'url' &&
        name.nodes.length
      ) {
        name = name.nodes[0];
      }

      dep = name.value;

      if (!dep) {
        throw new Error('Could not find import name for ' + rule);
      }

      if (PROTOCOL_RE.test(dep)) {
        return;
      }

      media = valueParser.stringify(media).trim();

      const task = async () => {
        const ext = path.extname(dep);
        const depDist = await this.getDepDist(dep, ext);
        const depExt = path.extname(depDist);
        if (depExt !== ext) {
          // app.wxss => app.css
          rule.params = `"${dep.replace(ext, depExt)}"`;
        }
        this.addDependency(dep, { media, loc: rule.source.start });
      };

      asyncTasks.push(task())

      this.ast.dirty = true;
    });

    this.ast.root.walkDecls((decl: any) => {
      if (URL_RE.test(decl.value)) {
        const parsed = valueParser(decl.value);
        let dirty = false;

        parsed.walk((node: any) => {
          if (
            node.type === 'function' &&
            node.value === 'url' &&
            node.nodes.length
          ) {
            const nodeValue: string = node.nodes[0].value;
            if (nodeValue.startsWith('data:')) {
              return;
            }
            const url = this.addURLDependency(nodeValue, this.name, {
              loc: decl.source.start
            });
            dirty = nodeValue !== url;
            node.nodes[0].value = url;
          }
        });

        if (dirty) {
          decl.value = parsed.toString();
          this.ast.dirty = true;
        }
      }
    });

    await Promise.all(asyncTasks);
  }

  async getDepDist(assetPath: string, ext: string) {
    const resolver = this.options.parser.resolver as Resolver;
    const { path: depPath } = await resolver.resolve(assetPath, this.name);
    const depAsset: Asset = this.options.parser.getAsset(depPath);
    if (depAsset instanceof CssAsset) {
      // .wxss => .css
      const depDistPath = depAsset.generateDistPath(assetPath, CssAsset.outExt);
      const depExt = path.extname(depDistPath);
      if (depExt !== ext) {
        assetPath = assetPath.replace(ext, depExt);
      }
    }
    return assetPath;
  }

  async transform() {
    await postcssTransform(this);
  }

  getCSSAst() {
    // Converts the ast to a CSS ast if needed, so we can apply postcss transforms.
    if (!(this.ast instanceof CSSAst)) {
      this.ast = CssAsset.prototype.parse.call(this, this.ast.render());
    }

    return this.ast.root;
  }

  async generate() {
    const css = this.ast ? this.ast.render() : this.contents;

    return {
      code: css,
      ext: CssAsset.outExt
    };
  }
}
