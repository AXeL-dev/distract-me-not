import { hasValidProtocol } from 'helpers/url';

describe('Url helper', () => {
  it('detects urls with a valid protocol', () => {
    const urls = [
      'http://website.com',
      'https://website.com',
      'ftp://website.com',
      'ftps://website.com',
      'file://my_file.txt',
      'chrome://extensions',
      'edge://extensions',
      'moz-extension://something',
      'chrome-extension://something',
      'extension://something',
      'about:addons',
    ];

    for (const url of urls) {
      const result = hasValidProtocol(url);
      expect(result).toEqual(true);
    }
  });

  it('detects urls with an invalid protocol', () => {
    const urls = [
      'my_file.txt',
      'www.website.com',
      'website.com',
      'foo://bar',
    ];

    for (const url of urls) {
      const result = hasValidProtocol(url);
      expect(result).toEqual(false);
    }
  });
});
