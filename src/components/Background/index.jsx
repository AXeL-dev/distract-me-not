/* global browser */

import React, { Component } from 'react';
import { storage, nativeAPI, indexUrl, getTab, sendNotification } from 'helpers/webext';
import { Mode, Action, defaultBlacklist, defaultWhitelist, defaultSchedule, unblockOptions, defaultUnblock, isAccessible } from 'helpers/block';
import { hasValidProtocol, getValidUrl, getHostName } from 'helpers/url';
import { transformList } from 'helpers/regex';
import { logger, defaultLogsSettings } from 'helpers/logger';
import { inTime } from 'helpers/time';
import { inToday, now } from 'helpers/date';
import { translate } from 'helpers/i18n';

export class Background extends Component {

  constructor(props) {
    super(props);
    // public
    this.blacklist = [];
    this.whitelist = [];
    this.isEnabled = false;
    this.mode = Mode.blacklist;
    this.action = Action.blockTab;
    this.redirectUrl = '';
    this.unblock = defaultUnblock;
    this.schedule = defaultSchedule;
    this.enableLogs = defaultLogsSettings.isEnabled;
    // private
    this.hasBeenEnabledOnStartup = false;
    this.enableLock = false;
    this.tmpAllowed = [];

    this.init();
  }

  debug = (message, ...params) => {
    //console.log(message, ...params); // uncomment this line to see logs
  }

  //----- Start getters & setters (for public properties)

  setSchedule = (value) => {
    this.schedule = value;
  }

  getSchedule = () => {
    return this.schedule;
  }

  setMode = (value) => {
    this.mode = value;
  }

  getMode = () => {
    return this.mode;
  }

  setIsEnabled = (value) => {
    this.isEnabled = value;
    if (this.isEnabled) {
      this.enable();
    } else {
      this.disable();
    }
  }

  getIsEnabled = () => {
    return this.isEnabled;
  }

  setBlacklist = (blist) => {
    this.blacklist = transformList(blist);
  }

  getBlacklist = () => {
    return this.blacklist;
  }

  setWhitelist = (wlist) => {
    this.whitelist = transformList(wlist);
  }

  getWhitelist = () => {
    return this.whitelist;
  }

  setAction = (value) => {
    this.action = value;
  }

  getAction = () => {
    return this.action;
  }

  setRedirectUrl = (url) => {
    this.redirectUrl = getValidUrl(url);
  }

  getRedirectUrl = () => {
    return this.redirectUrl;
  }

  setUnblockOnceTimeout = (value) => {
    this.unblock.unblockOnceTimeout = value;
  }

  getUnblockOnceTimeout = () => {
    return this.unblock.unblockOnceTimeout;
  }

  setDisplayNotificationOnTimeout = (value) => {
    this.unblock.displayNotificationOnTimeout = value;
  }

  getDisplayNotificationOnTimeout = () => {
    return this.unblock.displayNotificationOnTimeout;
  }

  setAutoReblockOnTimeout = (value) => {
    this.unblock.autoReblockOnTimeout = value;
  }

  getAutoReblockOnTimeout = () => {
    return this.unblock.autoReblockOnTimeout;
  }

  setLogsSettings = (logs) => {
    this.enableLogs = logs.isEnabled;
    logger.maxLength = logs.maxLength;
  }

  getLogsSettings = () => {
    return {
      enableLogs: this.enableLogs,
      maxLength: logger.maxLength,
    };
  }

  //----- End getters & setters

  init = () => {
    storage.get({
      blacklist: defaultBlacklist,
      whitelist: defaultWhitelist,
      blackList: null, // for backward compatibility (with v1)
      whiteList: null,
      isEnabled: this.isEnabled,
      mode: this.mode,
      action: this.action,
      unblock: this.unblock,
      schedule: this.schedule,
      redirectUrl: this.redirectUrl,
      enableLogs: this.enableLogs,
      logsLength: defaultLogsSettings.maxLength,
    }).then((items) => {
      this.debug('items:', items);
      //----- Start backward compatibility with v1
      if (items.blackList !== null) {
        items.blacklist = this.removeListDuplicates(
          items.blacklist.concat(items.blackList) // merge current & old list
        );
        storage.remove('blackList'); // remove old list from storage
        storage.set({ blacklist: items.blacklist }); // save merged list
      }
      if (items.whiteList !== null) {
        items.whitelist = this.removeListDuplicates(
          items.whitelist.concat(items.whiteList)
        );
        storage.remove('whiteList');
        storage.set({ whitelist: items.whitelist });
      }
      //----- End backward compatibility with v1
      this.blacklist = transformList(items.blacklist);
      this.whitelist = transformList(items.whitelist);
      this.mode = items.mode;
      this.action = items.action;
      this.unblock = { ...this.unblock, ...items.unblock }; // merge
      this.schedule = { ...this.schedule, ...items.schedule };
      this.redirectUrl = getValidUrl(items.redirectUrl);
      this.enableLogs = items.enableLogs;
      logger.maxLength = items.logsLength;
      if (!this.hasBeenEnabledOnStartup) {
        this.isEnabled = items.isEnabled;
        if (this.isEnabled) {
          this.enable();
        }
      }
      if (!this.isEnabled) {
        this.updateIcon();
      }
    });
    browser.runtime.onStartup.addListener(this.onBrowserStartup);
    browser.runtime.onMessage.addListener(this.handleMessage);
  }

  updateIcon = () => {
    browser.browserAction.setIcon({
      path: this.isEnabled ? {
        '16': 'icons/magnet-16.png',
        '32': 'icons/magnet-32.png',
        '48': 'icons/magnet-48.png',
        '64': 'icons/magnet-64.png',
        '128': 'icons/magnet-128.png',
      } : {
        '16': 'icons/magnet-grayscale-16.png',
        '32': 'icons/magnet-grayscale-32.png',
        '48': 'icons/magnet-grayscale-48.png',
        '64': 'icons/magnet-grayscale-64.png',
        '128': 'icons/magnet-grayscale-128.png',
      },
    });
  }

  removeListDuplicates = (list) => {
    return list.filter((url, index) => list.indexOf(url) === index);
  }

  onBrowserStartup = () => {
    storage.get({
      enableOnBrowserStartup: false
    }).then(({ enableOnBrowserStartup }) => {
      if (enableOnBrowserStartup && !this.isEnabled) {
        this.isEnabled = true;
        this.enable('enabled on startup!');
        this.hasBeenEnabledOnStartup = true;
      }
    });
  }

  handleMessage = (request, sender, sendResponse) => {
    this.debug('Handle message:', request);
    let response = null;
    return new Promise(resolve => {
      switch (request.message) {
        // unblockSenderTab
        case 'unblockSenderTab':
          const { url, option, time = 0 } = request.params[0];
          let timeout = 0;
          switch (option) {
            case unblockOptions.unblockForWhile: 
              timeout = time * 60000; // convert minutes to ms
              break;
            case unblockOptions.unblockOnce:
            default:
              timeout = this.unblock.unblockOnceTimeout * 1000; // convert seconds to ms
              break;
          }
          this.unblockTab(sender.tab.id, url, timeout);
          response = this.redirectTab(sender.tab.id, url);
          break;
        // redirectSenderTab
        case 'redirectSenderTab':
          response = this.redirectTab(sender.tab.id, ...request.params);
          break;
        // default
        default:
          response = this.isFunction(request.message) ? this.executeFunction(request.message, ...request.params) : this[request.message];
          break;
      }
      this.debug('response:', response);
      resolve({ response });
    });
  }

  unblockTab = (tabId, url, timeout) => {
    if (timeout > 0) {
      this.tmpAllowed.push({
        time: timeout,
        startedAt: new Date().getTime(),
        hostname: getHostName(url)
      });

      if (this.unblock.displayNotificationOnTimeout || this.unblock.autoReblockOnTimeout) {
        setTimeout(() => {
          if (this.unblock.displayNotificationOnTimeout) {
            const title = translate('appName');
            const message = translate('timeOverFor', url);
            sendNotification(message, title);
          }
          if (this.unblock.autoReblockOnTimeout) {
            this.debug('auto reblock after timeout:', tabId, timeout);
            getTab(tabId).then((tab) => { // get latest tab infos (url)
              this.redirectTab(tab.id, `${indexUrl}#blocked?url=${encodeURIComponent(tab.url)}`);
            });
          }
        }, timeout);
      }
    }
  }

  isFunction = (functionName) => {
    return this[functionName] && typeof this[functionName] === 'function';
  }

  executeFunction = (functionName, ...params) => {
    try {
      if (params) {
        return this[functionName](...params);
      } else {
        return this[functionName]();
      }
    } catch (error) {
      this.debug(error);
    }
  }

  handleAction = (data) => {
    switch (this.action) {
      case Action.blockTab:
      case Action.redirectToUrl:
      default:
        return {
          redirectUrl: this.action === Action.redirectToUrl && this.redirectUrl.length ? (
            this.redirectUrl
          ) : (
            `${indexUrl}#blocked?url=${encodeURIComponent(data.url)}`
          )
        };
      case Action.closeTab:
        this.closeTab(data.tabId);
        return {
          redirectUrl: 'javascript:window.close()' // eslint-disable-line
        };
    }
  }

  closeTab = (tabId) => {
    this.debug('closing tab:', tabId);
    nativeAPI.tabs.remove(tabId); // nativeAPI is used to fix weird errors on chrome due to browser-polyfill
  }

  redirectTab = (tabId, redirectUrl) => {
    this.debug('redirecting tab:', tabId, redirectUrl);
    nativeAPI.tabs.update(tabId, {
      url: redirectUrl
    });
  }

  removeOutdatedTmpAllowed = () => {
    const now = new Date().getTime();
    this.tmpAllowed = this.tmpAllowed.filter(allowed => {
      if (now > allowed.startedAt + allowed.time) {
        return false;
      } else {
        return true;
      }
    });
  }

  isTmpAllowed = (url) => {
    if (this.tmpAllowed.length) {
      this.removeOutdatedTmpAllowed();
      const hostname = getHostName(url);
      const index = this.tmpAllowed.map(allowed => allowed.hostname).indexOf(hostname);
      if (index !== -1) {
        this.debug('tmp allowed:', url);
        return true;
      }
    }
    this.debug('not tmp allowed:', url);
    return false;
  }

  isBlacklisted = (url) => {
    if (this.isTmpAllowed(url)) {
      return false;
    }
    for (const rule of this.blacklist) {
      if (rule.test(url)) {
        this.debug('is blacklisted:', url);
        return true;
      }
    }
    this.debug('not blacklisted:', url);
    return false;
  }

  isWhitelisted = (url) => {
    if (!isAccessible(url) || this.isTmpAllowed(url)) {
      return true;
    }
    for (const rule of this.whitelist) {
      if (rule.test(url)) {
        this.debug('is whitelisted:', url);
        return true;
      }
    }
    this.debug('not whitelisted:', url);
    return false;
  }

  parseUrl = (data, caller) => {
    this.debug('parsing url:', {
      caller: caller,
      data: data,
      mode: this.mode,
      blacklist: this.blacklist,
      whitelist: this.whitelist
    });
    // Handle schedule
    if (this.schedule.isEnabled) {
      try {
        if (!inToday(this.schedule.days)) {
          this.debug('not in schedule days:', this.schedule.days);
          return;
        } else {
          const [startHour, startMinute] = this.schedule.time.start.split(':');
          const start = Number(startHour) * 60 + Number(startMinute);
          const [endHour, endMinute] = this.schedule.time.end.split(':');
          const end = Number(endHour) * 60 + Number(endMinute);
          if (start && !inTime(start, end)) {
            this.debug('not in schedule time:', this.schedule.time);
            return;
          }
        }
      } catch (error) {
        this.debug(error);
      }
    }
    // Handle blocking
    let shouldBlock = false;
    switch (this.mode) {
      case Mode.blacklist:
        shouldBlock = this.isBlacklisted(data.url);
        break;
      case Mode.whitelist:
        shouldBlock = !this.isWhitelisted(data.url);
        break;
      case Mode.combined:
        shouldBlock = !this.isWhitelisted(data.url) && this.isBlacklisted(data.url);
        break;
      default:
        break;
    }
    // Log url
    if (this.enableLogs) {
      logger.add({ url: data.url, blocked: shouldBlock, date: now(true) });
    }
    // Execute action
    if (shouldBlock) {
      return this.handleAction(data);
    }
  }

  onBeforeRequestHandler = (requestDetails) => {
    return this.parseUrl(requestDetails, 'onBeforeRequestHandler'); // redirect will be handled by the event listener
  }

  onUpdatedHandler = (tabId, changeInfo, tab) => {
    if (changeInfo.url && hasValidProtocol(changeInfo.url)) {
      this.checkTab({ ...changeInfo, tabId: tabId }, 'onUpdatedHandler');
    }
  }

  onReplacedHandler = (addedTabId, removedTabId) => {
    browser.tabs.get(addedTabId).then((tab) => {
      if (tab) {
        this.checkTab({ url: tab.url, tabId: tab.id }, 'onReplacedHandler');
      }
    });
  }

  checkTab = (data, caller) => {
    const results = this.parseUrl(data, caller);
    if (results && results.redirectUrl) {
      this.redirectTab(data.tabId, results.redirectUrl);
    }
  }

  enableEventListeners = () => {
    browser.webRequest.onBeforeRequest.addListener(this.onBeforeRequestHandler, {
      urls: ['*://*/*'],
      types: ['main_frame', 'sub_frame']
    }, ["blocking"]);
    browser.tabs.onUpdated.addListener(this.onUpdatedHandler);
    browser.tabs.onReplaced.addListener(this.onReplacedHandler);
  }

  disableEventListeners = () => {
    browser.webRequest.onBeforeRequest.removeListener(this.onBeforeRequestHandler);
    browser.tabs.onUpdated.removeListener(this.onUpdatedHandler);
    browser.tabs.onReplaced.removeListener(this.onReplacedHandler);
  }

  checkAllTabs = () => {
    browser.tabs.query({}).then((tabs) => {
      if (tabs.length > 0) {
        for (const tab of tabs) {
          if (this.isEnabled) {
            this.checkTab({ url: tab.url, tabId: tab.id }, 'checkAllTabs');
          } else if (tab.url.startsWith(`${indexUrl}#/blocked?url=`)) {
            browser.tabs.reload(tab.id);
          }
        }
      }
    });
  }

  enable = (debugMessage = 'enabled!') => {
    if (this.enableLock) {
      this.debug('already enabled!', {
        enableLock: this.enableLock
      });
    } else {
      this.checkAllTabs();
      this.enableEventListeners();
      this.updateIcon();
      this.debug(debugMessage);
      this.enableLock = true;
    }
  }

  disable = (debugMessage = 'disabled!') => {
    if (this.enableLock) {
      this.disableEventListeners();
      this.checkAllTabs();
      this.updateIcon();
      this.debug(debugMessage);
      this.enableLock = false;
    } else {
      this.debug('already disabled!', {
        enableLock: this.enableLock
      });
    }
  }

  render() {
    return (
      <span>Silence is golden!</span>
    );
  }

}
