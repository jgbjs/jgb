import * as semver from 'semver';

describe('semver', () => {
  it('satisfies 1.9.0-alpha.2 < ^1.9.0', () => {
    expect(semver.satisfies('1.9.0-alpha.2', '^1.9.0')).toBe(false);
  });

  it('satisfies 1.9.1 > ^1.9.0', () => {
    expect(semver.satisfies('1.9.1', '^1.9.0')).toBe(true);
  });

  it('satisfies 1.9.0 >= ^1.9.0', () => {
    expect(semver.satisfies('1.9.0', '^1.9.0')).toBe(true);
  });

  it('satisfies 1.8.11 < ^1.9.0', () => {
    expect(semver.satisfies('1.8.11', '^1.9.0')).toBe(false);
  });

  it('gte 1.9.0-alpha.2 < 1.9.0', () => {
    expect(semver.gte('1.9.0-alpha.2', '1.9.0')).toBe(false);
  });

  it('gtr 1.9.0 > 1.8.11', () => {
    expect(semver.gtr('1.9.0', '~1.8.11')).toBe(true);
  });

  it('gtr 1.9.0-alpha.2 > 1.8.11', () => {
    expect(semver.gtr('1.9.0-alpha.2', '~1.8.11')).toBe(true);
  });

  it('gtr 1.8.11 ~1.8.11 should be false', () => {
    expect(semver.gtr('1.8.11', '~1.8.11')).toBe(false);
  });
});
