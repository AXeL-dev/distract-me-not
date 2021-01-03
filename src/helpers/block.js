
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
  return typeof url != "undefined" && 
         !url.startsWith("about:") && 
         !url.startsWith("file://") && 
         !url.startsWith("moz-extension://") && 
         !url.startsWith("chrome://");
}
