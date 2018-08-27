import { Asset, IInitOptions } from 'jgb-shared/lib';
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
    this.ast.root.walkAtRules('import', (rule: any) => {
      const params = valueParser(rule.params);
      let [name, ...media] = params.nodes;
      let dep;
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
      this.addDependency(dep, { media, loc: rule.source.start });
      // rule.remove();

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
            const url = this.addURLDependency(node.nodes[0].value, this.name, {
              loc: decl.source.start
            });
            dirty = node.nodes[0].value !== url;
            node.nodes[0].value = url;
          }
        });

        if (dirty) {
          decl.value = parsed.toString();
          this.ast.dirty = true;
        }
      }
    });
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
