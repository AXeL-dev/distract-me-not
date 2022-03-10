import { hasValidProtocol, getHostname, getFaviconLink } from 'helpers/url';

describe('url helper', () => {
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
    // prettier-ignore
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

  it('resolves urls hostnames correctly', () => {
    const payload = [
      {
        url: 'http://website.com',
        expected: 'website.com',
      },
      {
        url: 'https://website.com/something',
        expected: 'website.com',
      },
      {
        url: 'https://website.com/?param1=foo&param2=bar',
        expected: 'website.com',
      },
      {
        url: 'https://website.com/exact-url$',
        expected: 'website.com',
      },
      {
        url: '*.website.com',
        expected: 'website.com',
      },
      {
        url: '*.website.com/*',
        expected: 'website.com',
      },
    ];

    for (const { url, expected } of payload) {
      const result = getHostname(url);
      expect(result).toEqual(expected);
    }
  });

  it('resolves favicon links correctly', () => {
    const payload = [
      {
        url: 'http://website.com',
        expected: 'https://website.com/favicon.ico',
      },
      {
        url: 'https://website.com/something',
        expected: 'https://website.com/favicon.ico',
      },
      {
        url: 'https://website.com/exact-url$',
        expected: 'https://website.com/favicon.ico',
      },
      {
        url: '*.website.com',
        expected: 'https://website.com/favicon.ico',
      },
      {
        url: '*.website.com/*',
        expected: 'https://website.com/favicon.ico',
      },
    ];

    for (const { url, expected } of payload) {
      const result = getFaviconLink(url);
      expect(result).toEqual(expected);
    }
  });
});
