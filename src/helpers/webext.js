import { report } from './debug';
import { stripUrl } from './url';

function getNativeAPI() {
  try {
    return chrome || browser; // to know: browser is overridden by browser-polyfill
  } catch (error) {
    return null;
  }
}

function isBrowserAPIAvailable() {
  try {
    return !!browser;
  } catch (error) {
    return false;
  }
}

export const nativeAPI = getNativeAPI();

export const isWebExtension = isBrowserAPIAvailable();

export const indexUrl = isWebExtension ? browser.runtime.getURL('index.html') : '';

export const isFirefox = navigator.userAgent.indexOf('Firefox') !== -1;

export const isChrome = navigator.userAgent.indexOf('Chrome') !== -1;

export function openOptionsPage() {
  try {
    browser.runtime.openOptionsPage();
    if (isFirefox) {
      // refresh settings page when "open_in_tab" manifest option is false
      nativeAPI.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0].url && tabs[0].url.startsWith('about:addons')) {
          nativeAPI.tabs.reload(tabs[0].id);
        }
        window.close();
      });
    }
  } catch (error) {
    report.error(error);
  }
}

export function openExtensionPage(url, options = {}) {
  options = {
    reloadIfExists: true,
    closeCurrent: false,
    ...options,
  };
  const pageUrl = `${browser.runtime.getURL('index.html')}#${url}`;

  const handleClose = () => {
    if (options.closeCurrent) {
      window.close();
    }
  };

  const openInNewTab = () => {
    createTab(pageUrl);
    handleClose();
  };

  if (!options.reloadIfExists) {
    openInNewTab();
    return;
  }

  nativeAPI.tabs.query({}, (tabs) => {
    if (tabs.length > 0) {
      for (const tab of tabs) {
        if (stripUrl(tab.url) === stripUrl(pageUrl)) {
          nativeAPI.tabs.update(tab.id, {
            url: pageUrl,
            active: true,
          }, () => {
            nativeAPI.tabs.reload(tab.id);
            handleClose();
          });
          return;
        }
      }
      openInNewTab();
    }
  });
}

export function createTab(url, isActive = true) {
  return browser.tabs.create({
    url,
    active: isActive,
  });
}

export function createWindow(url, width = 600, height = 300, type = 'popup') {
  try {
    browser.windows.create({
      url,
      width,
      height,
      type,
      left: window.screen.availLeft + Math.round((window.screen.availWidth - width) / 2),
      top: window.screen.availTop + Math.round((window.screen.availHeight - height) / 2),
    });
  } catch (error) {
    report.error(error);
  }
}

/**
 * Send message to background script
 *
 * @param {string} message function to call (or variable)
 * @param  {...any} params function parameters
 */
export function sendMessage(message, ...params) {
  return new Promise((resolve) => {
    try {
      browser.runtime
        .sendMessage({
          message,
          params,
        })
        .then(({ response }) => {
          resolve(response);
        });
    } catch (error) {
      report.error(error);
      resolve(null);
    }
  });
}

export function getActiveTab() {
  return new Promise((resolve) => {
    try {
      browser.tabs
        .query({
          active: true,
          lastFocusedWindow: true,
        })
        .then((tabs) => {
          resolve(tabs[0]);
        });
    } catch (error) {
      report.error(error);
      resolve(null);
    }
  });
}

export function getTab(tabId) {
  return new Promise((resolve) => {
    try {
      browser.tabs.get(tabId).then((tabInfo) => {
        resolve(tabInfo);
      });
    } catch (error) {
      report.error(error);
      resolve(null);
    }
  });
}

export function sendNotification(
  message,
  title = 'Distract Me Not',
  type = 'basic',
  id = undefined
) {
  try {
    browser.notifications.create(id, {
      type,
      title,
      message,
      iconUrl: 'icons/magnet-128.png',
    });
  } catch (error) {
    report.error(error);
  }
}

export class storage {
  static get(items) {
    return new Promise((resolve) => {
      try {
        browser.storage.local.get(items).then((results) => {
          resolve(results);
        });
      } catch (error) {
        report.error(error);
        resolve(items);
      }
    });
  }

  static set(items) {
    return new Promise((resolve) => {
      try {
        browser.storage.local.set(items).then(() => {
          resolve(true);
        });
      } catch (error) {
        report.error(error);
        resolve(false);
      }
    });
  }

  static remove(keys) {
    return new Promise((resolve) => {
      try {
        browser.storage.local.remove(keys).then(() => {
          resolve(true);
        });
      } catch (error) {
        report.error(error);
        resolve(false);
      }
    });
  }
}
