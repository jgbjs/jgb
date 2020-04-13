import * as pt from 'prettier';
import { PLATFORM } from '../src/platforms';
import { FileType, preProcess } from '../src/utils/preProcess';

function prettier(code: string, parser: string = 'babel') {
  return pt.format(code, {
    parser
  });
}

describe('preProcess', () => {
  it(`no match syntax`, () => {
    expect(() =>
      preProcess(
        `
      .page {
        /* @if wx */
        color: #fff;
      }
    `,
        FileType.CSS
      )
    ).toThrow(Error);
  });

  it(`no match var`, () => {
    expect(() =>
      preProcess(
        `
      .page {
        /* @if novar */
        color: #fff;
        /* @endif */
      }
    `,
        FileType.CSS
      )
    ).toThrow(Error);
  });
});

describe('preProcess match', () => {
  beforeEach(() => {
    process.env.JGB_ENV = PLATFORM.WEIXIN;
  });

  it('css', () => {
    const result = preProcess(
      `
      .page {
        /* @if wx */
        color: #fff;
        /* @endif */
      }
    `,
      FileType.CSS
    );
    expect(prettier(result, 'css')).toBe(prettier(`.page{color:#fff;}`, 'css'));
  });

  it('html', () => {
    const result = preProcess(
      `
      <view>
        <!-- @if wx -->
        weixin
        <!-- @endif -->
      </view>
    `,
      FileType.HTML
    );
    expect(prettier(result, 'html')).toBe(
      prettier(
        `
    <view>
      weixin
    </view>`,
        'html'
      )
    );
  });

  it('multiple platform', () => {
    const result = preProcess(
      `
      // @if wx || swan
      var test = 1;
      // @endif
    `,
      FileType.JS
    );
    expect(prettier(result)).toBe(prettier(`var test = 1;`));
  });
});

describe('preProcess not match', () => {
  beforeEach(() => {
    process.env.JGB_ENV = PLATFORM.BAIDU;
  });

  it('css', () => {
    const result = preProcess(
      `
      .page {
        /* @if wx */
        color: #fff;
        /* @endif */
      }
    `,
      FileType.CSS
    );
    expect(prettier(result, 'css')).toBe(prettier(`.page{}`, 'css'));
  });

  it('html', () => {
    const result = preProcess(
      `
      <view>
        <!-- @if wx -->
        weixin
        <!-- @endif -->
      </view>
    `,
      FileType.HTML
    );
    expect(prettier(result, 'html')).toBe(prettier(`<view> </view>`, 'html'));
  });
});
