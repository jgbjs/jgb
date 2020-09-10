import { isPlatformFile } from '../src/utils/platfromFile';

describe('platfromFile', () => {
  it('isPlatformFile', () => {
    expect(isPlatformFile('index.js')).toBe(false);
    expect(isPlatformFile('index.swan.js')).toBe(true);
    expect(isPlatformFile('project.swan.json')).toBe(false);
    expect(isPlatformFile('project.config.json')).toBe(false);
    expect(isPlatformFile('index.swan.js', 'swan')).toBe(true);
    expect(isPlatformFile('index.swan.js', 'my')).toBe(true);
  });
});
