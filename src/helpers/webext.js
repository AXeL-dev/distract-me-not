import { report } from "./debug";

export function isWebExtension() {
  try {
    return !!browser.runtime.id;
  } catch (error) {
    return false;
  }
}

export function openOptionsPage() {
  try {
    browser.runtime.openOptionsPage();
    window.close();
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
    try {
      browser.storage.local.set(items);
    } catch (error) {
      report.error(error);
    }
  }

}
