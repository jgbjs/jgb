import * as postcss from 'postcss';

export default class CSSAst {
  dirty = false;
  constructor(public css: string, public root: any) {}

  render() {
    if (this.dirty) {
      this.css = '';
      postcss.stringify(this.root, (c: string) => (this.css += c));
    }

    return this.css;
  }
}
