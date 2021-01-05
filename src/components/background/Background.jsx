import { Component } from 'react';
import { storage } from '../../helpers/webext';
import { Mode, Action, defaultBlacklist, defaultWhitelist } from '../../helpers/block';
import { hasValidProtocol, getValidUrl } from '../../helpers/url';
import { regex } from '../../helpers/regex';

export default class Background extends Component {

  constructor(props) {
    super(props);
    this.blacklist = [];
    this.whitelist = [];
    this.isEnabled = false;
    this.mode = Mode.blacklist;
    this.action = Action.blockTab;
    this.redirectUrl = '';

    this.init();
  }

  //----- Start getters & setters

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
    this.blacklist = this.transformList(blist);
  }

  getBlacklist = () => {
    return this.blacklist;
  }

  setWhitelist = (wlist) => {
    this.whitelist = this.transformList(wlist);
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

  //----- End getters & setters

  init = () => {
    storage.get({
      blacklist: defaultBlacklist,
      whitelist: defaultWhitelist,
      isEnabled: false,
      mode: Mode.blacklist,
      action: Action.blockTab,
      redirectUrl: '',
      enableOnBrowserStartup: false
    }).then((items) => {
      this.blacklist = this.transformList(items.blacklist);
      this.whitelist = this.transformList(items.whitelist);
      this.mode = items.mode;
      this.action = items.action;
      this.redirectUrl = getValidUrl(items.redirectUrl);
      this.isEnabled = items.enableOnBrowserStartup ? true : items.isEnabled;
      if (!items.enableOnBrowserStartup && this.isEnabled) {
        // if "enableOnBrowserStartup" is true we don't have to call "enable" function here, it will be done on "onBrowserStartup" event listener
        this.enable();
      }
    });
    browser.runtime.onStartup.addListener(this.onBrowserStartup);
    browser.runtime.onMessage.addListener(this.handleMessage);
  }

  transformList = (list) => {
    return list.map(url => regex.wildcard(url)).map(url => regex.new(url));
  }

  onBrowserStartup = () => {
    storage.get({
      enableOnBrowserStartup: false
    }).then(({ enableOnBrowserStartup }) => {
      if (enableOnBrowserStartup) {
        this.enable();
      }
    });
  }

  handleMessage = (request, sender, sendResponse) => {
    // console.log("Handle message:", request);
    return Promise.resolve({
      response: this.isFunction(request.message) ? this.executeFunction(request.message, ...request.params) : this[request.message]
    });
  }

  isFunction = (functionName) => {
    return this[functionName] && typeof this[functionName] === 'function';
  }

  executeFunction = (functionName, ...params) => {
    if (params) {
      return this[functionName](...params);
    } else {
      return this[functionName]();
    }
  }

  performAction = (data) => {
    switch (this.action) {
      case Action.blockTab:
      case Action.redirectToUrl:
        return {
          redirectUrl: Action.redirectToUrl && this.redirectUrl.length ? (
            this.redirectUrl
          ) : (
            `${browser.runtime.getURL('index.html')}#blocked?url=${encodeURIComponent(data.url)}`
          )
        };
      case Action.closeTab:
        console.log(data.tabId);
        browser.tabs.remove(data.tabId);
        return {
          redirectUrl: 'javascript:window.close()'
        };
    }
  }

  isBlacklisted = (url) => {
    for (const rule of this.blacklist) {
      if (rule.test(url)) {
        return true;
      }
    }
    return false;
  }

  isWhitelisted = (url) => {
    for (const rule of this.whitelist) {
      if (rule.test(url)) {
        return true;
      }
    }
    return false;
  }

  parseUrl = (data, caller) => {
    // console.log('parsing url:', {
    //   caller: caller,
    //   data: data,
    //   mode: this.mode,
    //   blacklist: this.blacklist,
    //   whitelist: this.whitelist
    // });
    switch (this.mode) {
      case Mode.blacklist:
        if (this.isBlacklisted(data.url)) {
          return this.performAction(data);
        }
        break;
      case Mode.whitelist:
        if (!this.isWhitelisted(data.url)) {
          return this.performAction(data);
        }
        break;
    }
  }

  onBeforeRequestHandler = (requestDetails) => {
    return this.parseUrl(requestDetails, 'onBeforeRequestHandler');
  }

  onUpdatedHandler = (tabId, changeInfo, tab) => {
    if (changeInfo.url && hasValidProtocol(changeInfo.url)) {
      const results = this.parseUrl(changeInfo, 'onUpdatedHandler');
      if (results && results.redirectUrl) {
        browser.tabs.update(tabId, {
          url: results.redirectUrl
        });
      }
    }
  }

  enableEventListeners = () => {
    browser.webRequest.onBeforeRequest.addListener(this.onBeforeRequestHandler, {
      urls: ['*://*/*'],
      types: ['main_frame', 'sub_frame']
    }, ["blocking"]);
    browser.tabs.onUpdated.addListener(this.onUpdatedHandler);
  }

  disableEventListeners = () => {
    browser.webRequest.onBeforeRequest.removeListener(this.onBeforeRequestHandler);
    browser.tabs.onUpdated.removeListener(this.onUpdatedHandler);
  }

  enable = () => {
    this.enableEventListeners();
  }

  disable = () => {
    this.disableEventListeners();
  }

  render() {
    return (
      <span>Silence is golden!</span>
    );
  }

}
