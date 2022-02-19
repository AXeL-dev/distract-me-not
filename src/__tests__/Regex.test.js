import { regex, transformList } from 'helpers/regex';

describe('Regex helper', () => {
  it('exposes needed functions', () => {
    expect(regex.wildcard).toBeInstanceOf(Function);
    expect(regex.new).toBeInstanceOf(Function);
    expect(transformList).toBeInstanceOf(Function);
  });

  it('transforms urls to regular expressions', () => {
    const payload = [
      {
        url: 'http://website.com',
        expected: /^http:\/\/website\.com$/i,
      },
      {
        url: 'https://website.com',
        expected: /^https:\/\/website\.com$/i,
      },
      {
        url: 'website.com',
        expected: /^.*:\/\/website\.com(\/|$).*$/i,
      },
      {
        url: '*.website.com',
        expected: /^.*:\/\/(.*\.)?website\.com(\/|$).*$/i,
      },
      {
        url: 'website.com$',
        expected: /^.*:\/\/website\.com(\/|$)$/i,
      },
      {
        url: 'website.com/*',
        expected: /^.*:\/\/website\.com\/.*(\/|$).*$/i,
      },
      {
        url: 'website.com/*/article$',
        expected: /^.*:\/\/website\.com\/.*\/article(\/|$)$/i,
      },
    ];

    const result = transformList(payload.map(({ url }) => url));
    const expected = payload.map(({ expected }) => expected);

    expect(result).toEqual(expected);
  });

  it('returns the exact url as a regular expression if the url starts with a circumflex accent (^)', () => {
    const payload = [
      {
        url: '^website.com',
        expected: /^website.com/i,
      },
      {
        url: '^website.com$',
        expected: /^website.com$/i,
      },
      {
        url: '^.*://website.com/.*',
        expected: /^.*:\/\/website.com\/.*/i,
      },
    ];

    const result = transformList(payload.map(({ url }) => url));
    const expected = payload.map(({ expected }) => expected);

    expect(result).toEqual(expected);
  });

  it('returns case insensitive regular expressions', () => {
    const url = 'https://website.com';
    const payload = [
      '*.website.com',
      '*.Website.com',
      '*.WEBSITE.com',
    ];

    const result = transformList(payload).map((regex) => regex.test(url));
    const expected = payload.map(() => true);

    expect(result).toEqual(expected);
  });
});
