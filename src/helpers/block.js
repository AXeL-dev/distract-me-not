import { DaysOfWeek } from "./date";
import { translate } from './i18n';

export const Mode = {
  blacklist: 'blacklist',
  whitelist: 'whitelist',
  combined: 'combined'
};

export const Action = {
  blockTab: 'blockTab',
  redirectToUrl: 'redirectToUrl',
  closeTab: 'closeTab'
};

export const modes = [
  { label: translate('blacklist'), value: Mode.blacklist },
  { label: translate('whitelist'), value: Mode.whitelist },
  { label: translate('combined'), value: Mode.combined },
];

export const actions = [
  { label: translate('blockTab'), value: Action.blockTab },
  { label: translate('redirectToUrl'), value: Action.redirectToUrl },
  { label: translate('closeTab'), value: Action.closeTab },
];

export const defaultAction = Action.blockTab;

export const defaultMode = Mode.blacklist;

export const defaultBlacklist = [
  '*.facebook.com',
  '*.twitter.com',
  '*.youtube.com'
];

export const defaultWhitelist = [
  '*.wikipedia.org'
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

export const defaultUnblockOnceTimeout = 10; // seconds

export function isAccessible(url) {
  return url && !url.startsWith("about:") && !/^(?:file|chrome|moz-extension|chrome-extension):\/\//i.test(url);
}
