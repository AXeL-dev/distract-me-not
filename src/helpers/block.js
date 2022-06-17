import { translate } from './i18n';
import { isAndroidDevice } from './device';
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

export const FramesType = {
  all: ['main_frame', 'sub_frame'],
  main: ['main_frame'],
  // sub: ['sub_frame'],
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

export const framesTypes = [
  { label: translate('allFrames'), value: FramesType.all },
  { label: translate('mainFrames'), value: FramesType.main },
  // blocking only sub frames doesn't seem to work on chrome
  // { label: translate('subFrames'), value: FramesType.sub },
];

export const defaultIsEnabled = false;

export const defaultAction = Action.blockTab;

export const defaultMode = Mode.combined;

export const defaultFramesType = FramesType.all;

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

export const defaultBlockSettings = {
  message: '',
  displayBlankPage: false,
  displayBlockedLink: false,
};

export const defaultUnblockSettings = {
  isEnabled: false,
  requirePassword: false,
  unblockOnceTimeout: 10, // seconds
  displayNotificationOnTimeout: true,
  autoReblockOnTimeout: false,
};

export const defaultPasswordSettings = {
  isEnabled: false,
  isSet: false,
  value: '',
  hash: '',
  allowActivationWithoutPassword: false,
  allowAddingWebsitesWithoutPassword: false,
  blockAccessToExtensionsPage: false,
};

// prettier-ignore
export function isAccessible(url) {
  return !!url && !/^((file|chrome|edge|moz-extension|chrome-extension|extension):\/\/|about:)/i.test(url);
}

export function isExtensionsPage(url) {
  return !!url && [
    'about:addons',
    'chrome://extensions',
    'edge://extensions',
  ].some((prefix) => url.startsWith(prefix));
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
      const isAndroid = await isAndroidDevice();
      if (isAndroid) {
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
