import { matchAlias as m } from '../src/utils/matchAlias';

const matchAlias = (...args: string[]) => !!m(args[0], args[1]);

describe('matchAlias', () => {
  test('@utils/ => @utils/index', () => {
    const isMatch = matchAlias('@utils/', '@utils/index');
    expect(isMatch).toBeTruthy();
  });

  test('@utils/* => @utils/index', () => {
    const isMatch = matchAlias('@utils/*', '@utils/index');
    expect(isMatch).toBeTruthy();
  });

  test('@utils/* => @utils/index/index.js', () => {
    const isMatch = matchAlias('@utils/*', '@utils/index/index.js');
    expect(isMatch).toBeTruthy();
  });

  test('@utils/index => @utils/index', () => {
    const isMatch = matchAlias('@utils/index', '@utils/index');
    expect(isMatch).toBeTruthy();
  });

  test('@utils/* => @util/index not match', () => {
    const isMatch = matchAlias('@utils/*', '@util/index');
    expect(isMatch).toBeFalsy();
  });
});
