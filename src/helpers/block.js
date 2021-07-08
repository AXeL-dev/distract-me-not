import { DaysOfWeek } from './date';
import { translate } from './i18n';
import { sendMessage, storage } from 'helpers/webext';

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
  { label: translate('combined'), value: Mode.combined, tooltip: translate('combinedDescription') },
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

export const defaultUnblock = {
  isEnabled: false,
  requirePassword: false,
  unblockOnceTimeout: 10, // seconds
  displayNotificationOnTimeout: true,
  autoReblockOnTimeout: false,
};

export const unblockOptions = {
  unblockOnce: 'unblock-once',
  unblockForWhile: 'unblock-for-while'
};

export function isAccessible(url) {
  return url && !url.startsWith("about:") && !/^(?:file|chrome|moz-extension|chrome-extension):\/\//i.test(url);
}

export function blockUrl(url, mode = Mode.blacklist) {
  switch (mode) {
    case Mode.blacklist:
    case Mode.combined:
      storage.get({
        blacklist: defaultBlacklist
      }).then(({ blacklist }) => {
        for (const item of blacklist) {
          if (item === url) {
            return;
          }
        }
        blacklist.splice(0, 0, url);
        sendMessage('setBlacklist', blacklist);
        storage.set({ blacklist: blacklist });
      });
      break;
    case Mode.whitelist:
      // ToDo: merge common code (@see above)
      storage.get({
        whitelist: defaultWhitelist
      }).then(({ whitelist }) => {
        for (const item of whitelist) {
          if (item === url) {
            return;
          }
        }
        whitelist.splice(0, 0, url);
        sendMessage('setWhitelist', whitelist);
        storage.set({ whitelist: whitelist });
      });
      break;
    default:
      break;
  }
}
