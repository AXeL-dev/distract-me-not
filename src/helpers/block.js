
export const Mode = {
  blacklist: 'blacklist',
  whitelist: 'whitelist'
};

export const Action = {
  blockTab: 'blockTab',
  redirectToUrl: 'redirectToUrl',
  closeTab: 'closeTab'
};

export const defaultBlacklist = [
  'facebook.com',
  'twitter.com',
  'youtube.com'
];

export const defaultWhitelist = [
  'wikipedia.org'
];

export function isAccessible(url) {
  return url && !url.startsWith("about:") && !/^(?:file|chrome|moz\-extension)\:\/\//i.test(url);
}
