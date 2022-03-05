import { isAccessible } from 'helpers/block';

describe('Block helper', () => {
  it('detects accessible urls', () => {
    const urls = [
      'http://website.com',
      'https://website.com',
    ];

    for (const url of urls) {
      const result = isAccessible(url);
      expect(result).toEqual(true);
    }
  });

  it('detects inaccessible urls', () => {
    const urls = [
      'file://my_file.txt',
      'chrome://extensions',
      'edge://extensions',
      'moz-extension://something',
      'chrome-extension://something',
      'extension://something',
      'about:addons',
    ];

    for (const url of urls) {
      const result = isAccessible(url);
      expect(result).toEqual(false);
    }
  });
});
