import { translate } from './i18n';
import { isSmallDevice } from './device';
import { getHostname, isUrl } from './url';
import { sendMessage, storage, getActiveTab, createWindow, indexUrl } from './webext';

export const Mode = {
  blacklist: 'blacklist',
  whitelist: 'whitelist',
  combined: 'combined',
};

export const Action = {
  blockTab: 'blockTab',
  redirectToUrl: 'redirectToUrl',
  closeTab: 'closeTab',
};

export const UnblockOptions = {
  unblockOnce: 'unblock-once',
  unblockForWhile: 'unblock-for-while',
};

// prettier-ignore
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

export const defaultIsEnabled = false;

export const defaultAction = Action.blockTab;

export const defaultMode = Mode.combined;

// prettier-ignore
export const defaultBlacklist = [
  '*.facebook.com',
  '*.twitter.com',
  '*.youtube.com',
];

// prettier-ignore
export const defaultWhitelist = [
  '*.wikipedia.org',
];

export const defaultUnblock = {
  isEnabled: false,
  requirePassword: false,
  unblockOnceTimeout: 10, // seconds
  displayNotificationOnTimeout: true,
  autoReblockOnTimeout: false,
};

// prettier-ignore
export function isAccessible(url) {
  return !!url && !/^((file|chrome|edge|moz-extension|chrome-extension|extension):\/\/|about:)/i.test(url);
}

export function isPageReloaded() {
  try {
    return (
      (window.performance.navigation && window.performance.navigation.type === 1) ||
      window.performance
        .getEntriesByType('navigation')
        .map((nav) => nav.type)
        .includes('reload')
    );
  } catch (error) {
    return false;
  }
}

export function blockUrl(url, mode = Mode.blacklist, tabId = null) {
  return new Promise((resolve, reject) => {
    switch (mode) {
      case Mode.blacklist:
      case Mode.combined:
        storage
          .get({
            blacklist: defaultBlacklist,
          })
          .then(({ blacklist }) => {
            for (const item of blacklist) {
              if (item === url) {
                resolve(false);
                return;
              }
            }
            blacklist.splice(0, 0, url);
            sendMessage('setBlacklist', blacklist, tabId);
            storage.set({ blacklist: blacklist });
            resolve(true);
          })
          .catch((error) => {
            reject(error);
          });
        break;
      case Mode.whitelist:
        // ToDo: merge common code (@see above)
        storage
          .get({
            whitelist: defaultWhitelist,
          })
          .then(({ whitelist }) => {
            for (const item of whitelist) {
              if (item === url) {
                resolve(false);
                return;
              }
            }
            whitelist.splice(0, 0, url);
            sendMessage('setWhitelist', whitelist, tabId);
            storage.set({ whitelist: whitelist });
            resolve(true);
          })
          .catch((error) => {
            reject(error);
          });
        break;
      default:
        break;
    }
  });
}

export async function addCurrentWebsite(mode, isPrompt = false, exactUrl = false) {
  const tab = await getActiveTab();
  if (tab) {
    const url = exactUrl ? `${tab.url}$` : `*.${getHostname(tab.url)}`;
    if (isPrompt) {
      if (isSmallDevice()) {
        const response = window.prompt(translate('addWebsite'), url);
        if (response !== null && isUrl(response)) {
          blockUrl(response, mode, tab.id);
          return true;
        }
      } else {
        createWindow(`${indexUrl}#addWebsitePrompt?url=${encodeURIComponent(url)}&mode=${mode}&tabId=${tab.id}`, 600, 140);
      }
    } else {
      blockUrl(url, mode, tab.id);
      return true;
    }
  }
  return false;
}

export async function isActiveTabBlockable(mode) {
  const tab = await getActiveTab();
  if (!tab) {
    return false;
  }
  const isBlockable = await isTabBlockable(tab, mode);
  return isBlockable;
}

export async function isTabBlockable(
  tab,
  mode,
  { isBlacklistedCallback, isWhitelistedCallback } = {}
) {
  if (!tab || !isAccessible(tab.url)) {
    return false;
  } else {
    switch (mode) {
      case Mode.blacklist:
      case Mode.combined:
        const isBlacklisted = isBlacklistedCallback
          ? isBlacklistedCallback(tab.url)
          : await sendMessage('isBlacklisted', tab.url);
        if (isBlacklisted) {
          return false;
        }
        break;
      case Mode.whitelist:
        const isWhitelisted = isWhitelistedCallback
          ? isWhitelistedCallback(tab.url)
          : await sendMessage('isWhitelisted', tab.url);
        if (isWhitelisted) {
          return false;
        }
        break;
      default:
        break;
    }
  }
  return true;
}
