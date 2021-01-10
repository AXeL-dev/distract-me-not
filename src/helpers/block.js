import { DaysOfWeek } from "./date";

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

export const defaultSchedule = {
  isEnabled: false,
  time: {
    start: '',
    end: ''
  },
  days: DaysOfWeek
};

export const unblockOptions = {
  unblockOnce: 'unblock-once',
  unblockForWhile: 'unblock-for-while'
};

export function isAccessible(url) {
  return url && !url.startsWith("about:") && !/^(?:file|chrome|moz\-extension|chrome\-extension)\:\/\//i.test(url);
}
