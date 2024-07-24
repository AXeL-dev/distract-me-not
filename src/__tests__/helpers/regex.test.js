import { regex, transformList, transformKeywords } from 'helpers/regex';

describe('regex helper', () => {
  it('exposes needed functions', () => {
    expect(regex.wildcard).toBeInstanceOf(Function);
    expect(regex.create).toBeInstanceOf(Function);
    expect(regex.parseUrl).toBeInstanceOf(Function);
    expect(transformList).toBeInstanceOf(Function);
    expect(regex.parseKeyword).toBeInstanceOf(Function);
    expect(transformKeywords).toBeInstanceOf(Function);
  });

  it('transforms urls to regular expressions', () => {
    const payload = [
      {
        url: 'http://website',
        expected: /^http:\/\/website$/i,
      },
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
    // prettier-ignore
    const payload = [
      '*.website.com',
      '*.Website.com',
      '*.WEBSITE.com',
    ];

    const result = transformList(payload).map((regex) => regex.test(url));
    const expected = payload.map(() => true);

    expect(result).toEqual(expected);
  });

  it('transforms keywords to regular expressions', () => {
    const payload = [
      {
        keyword: 'foo',
        expected: /foo/,
      },
      {
        keyword: 'bar?',
        expected: /bar\?/,
      },
      {
        keyword: '/bar?/i',
        expected: /bar?/i,
      },
      {
        keyword: '/(foo|bar)/i',
        expected: /(foo|bar)/i,
      },
      {
        keyword: 'doo.*',
        expected: /doo\.\*/,
      },
      {
        keyword: '/doo.*/',
        expected: /doo.*/,
      },
      {
        keyword: '/doo.*/gi',
        expected: /doo.*/gi,
      },
      {
        keyword: '/doo.*/ii',
        expected: /\/doo\.\*\/ii/,
      },
      {
        keyword: '/doo.*/gigi',
        expected: /\/doo\.\*\/gigi/,
      },
      {
        keyword: '/doo.*/ii/iu',
        expected: /doo.*\/ii/iu,
      },
    ];

    const result = transformKeywords(payload.map(({ keyword }) => keyword));
    const expected = payload.map(({ expected }) => expected);

    expect(result).toEqual(expected);
  });
});
