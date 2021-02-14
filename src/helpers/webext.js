/* global browser, chrome */

import { report } from "./debug";

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

export function isFirefox() {
  return navigator.userAgent.indexOf("Firefox") !== -1;
}

export function isChrome() {
  return navigator.userAgent.indexOf("Chrome") !== -1;
}

export function openOptionsPage() {
  try {
    browser.runtime.openOptionsPage();
    if (isFirefox()) {
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

/**
 * Send message to background script
 * 
 * @param {string} message function to call (or variable)
 * @param  {...any} params function parameters
 */
export function sendMessage(message, ...params) {
  return new Promise(resolve => {
    try {
      browser.runtime.sendMessage({
        message: message,
        params: params
      }).then(({ response }) => {
        resolve(response);
      });
    } catch (error) {
      report.error(error);
      resolve(null);
    }
  });
}

export function getActiveTab() {
  return new Promise(resolve => {
    try {
      browser.tabs.query({
        active: true,
        lastFocusedWindow: true
      }).then(tabs => {
        resolve(tabs[0]);
      });
    } catch (error) {
      report.error(error);
      resolve(null);
    }
  });
}

export function getActiveTabHostname() {
  return new Promise(resolve => {
    getActiveTab().then(tab => {
      if (tab) {
        const parser = document.createElement("a");
        parser.href = tab.url;
        const host = parser.hostname;
        resolve(host);
      } else {
        resolve(null);
      }
    });
  });
}

export class storage {

  static get(items) {
    return new Promise(resolve => {
      try {
        browser.storage.local.get(items).then(results => {
          resolve(results);
        });
      } catch (error) {
        report.error(error);
        resolve(null);
      }
    });
  }

  static set(items) {
    return new Promise(resolve => {
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
    return new Promise(resolve => {
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
