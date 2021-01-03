import { Component } from 'react';
import { storage } from '../../helpers/webext';
import { Mode, Action, defaultBlacklist, defaultWhitelist, isAccessible } from '../../helpers/block';

export default class Background extends Component {

  constructor(props) {
    super(props);
    this.blacklist = [];
    this.whitelist = [];
    this.isEnabled = false;
    this.mode = Mode.blacklist;
    this.action = Action.blockTab;
    this.redirectUrl = '';
    this.disableKeyboard = false;

    this.init();
  }

  init = () => {
    storage.get({
      blacklist: defaultBlacklist,
      whitelist: defaultWhitelist,
      isEnabled: false,
      mode: Mode.blacklist,
      action: Action.blockTab,
      redirectUrl: '',
      disableKeyboard: false,
      enableOnBrowserStartup: false
    }).then((items) => {
      this.blacklist = items.blacklist;
      this.whitelist = items.whitelist;
      this.mode = items.mode;
      this.action = items.action;
      this.redirectUrl = items.redirectUrl;
      this.disableKeyboard = items.disableKeyboard;
      this.isEnabled = items.enableOnBrowserStartup ? true : items.isEnabled;
      if (!items.enableOnBrowserStartup && this.isEnabled) { // ToDo: review this condition
        this.enable();
      }
    });
    browser.runtime.onStartup.addListener(this.onBrowserStartup);
    browser.runtime.onMessage.addListener(this.handleMessage);
  }

  onBrowserStartup = () => {
    storage.get({
      enableOnBrowserStartup: false
    }).then(({ enableOnBrowserStartup }) => {
      if (enableOnBrowserStartup) {
        enable();
      }
    });
  }

  handleMessage = (request, sender, sendResponse) => {
    //console.log("Handle message:", request);
    sendResponse({
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

  blockTab = (tab) => {
    if (isAccessible(tab.url)) {
      browser.tabs.sendMessage(tab.id, {
        request: "block",
        disableKeyboard: this.disableKeyboard
      });
    }
  }

  unblockTab = (tab) => {
    if (isAccessible(tab.url)) {
      browser.tabs.sendMessage(tab.id, {
        request: "unblock"
      });
    }
  }

  redirectTab = (tab) => {
    //console.log(this.redirectUrl);
    if (isAccessible(tab.url) && this.redirectUrl != '' && !tab.url.startsWith(this.redirectUrl)) {
      if (!this.redirectUrl.startsWith("about:") && 
          !this.redirectUrl.startsWith("file://") && 
          !this.redirectUrl.startsWith("http://") && 
          !this.redirectUrl.startsWith("https://")) { // ToDo: refactor using regex
        this.redirectUrl = "https://" + this.redirectUrl;
      }
      disableEventHandlers();
      if (chrome) {
        browser.tabs.update(tab.id, {
          url: this.redirectUrl
        }).then(() => {
          this.enableEventHandlers();
        });
      } else {
        browser.tabs.update(tab.id, {
          url: this.redirectUrl,
          loadReplace: true
        }).then((tab) => {
          this.enableEventHandlers();
        }).catch((error) => {
          this.enableEventHandlers();
        });
      }
    }
  }

  closeTab = (tab) => {
    if (isAccessible(tab.url)) {
      browser.tabs.remove(tab.id);
    }
  }

  isDistracting = (tab) => {
    return (this.mode === Mode.whitelist && !this.isWhitelisted(tab)) || 
           (this.mode === Mode.blacklist && this.isBlacklisted(tab));
  }

  checkTab = (tab) => {
    //console.log('checking tab', tab);
    if (this.isDistracting(tab)) {
      //console.log(this.action);
      switch (this.action) {
        case Action.blockTab:
          this.blockTab(tab);
          break;
        case Action.redirectToUrl:
          this.redirectTab(tab);
          break;
        case Action.closeTab:
          this.closeTab(tab);
          break;
      }
    }
  }

  updateAllTabs = () => {
    if (this.isEnabled && this.action === Action.blockTab) {
      browser.tabs.query({}).then((tabs) => {
        if (tabs.length > 0) {
          for (let index in tabs) {
            const tab = tabs[index];
            if (this.isDistracting(tab)) {
              this.blockTab(tab);
            } else {
              this.unblockTab(tab);
            }
          }
        }
      });
    }
  }

  onUpdatedHandler = (tabId, changeInfo, tab) => {
    this.checkTab(tab);
  }

  onReplacedHandler = (addedTabId, removedTabId) => {
    browser.tabs.get(addedTabId).then((tab) => {
      if (tab !== null) {
        this.checkTab(tab);
      }
    });
  }

  isBlacklisted = (tab) => {
      if (typeof tab.url == "undefined") {
        return false;
      }
      for (let index in this.blacklist) {
        if (tab.url.toLowerCase().indexOf(this.blacklist[index].toLowerCase()) >= 0) {
          return true;
        }
      }
      return false;
  }

  isWhitelisted = (tab) => {
    if (typeof tab.url == "undefined") {
      return true;
    }
    if (tab.url.startsWith("chrome://newtab")) {
      return true;
    }
    for (let index in this.whitelist) {
      if (tab.url.toLowerCase().indexOf(this.whitelist[index].toLowerCase()) >= 0) {
        return true;
      }
    }
    return false;
  }

  setMode = (value) => {
    this.mode = value;
    this.updateAllTabs();
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
    //this.blacklist = blist; // this causes "can't access dead object" error, ToDo: review/retest
    this.blacklist.length = 0;
    this.blacklist.push.apply(this.blacklist, blist);
    this.updateAllTabs();
  }

  getBlacklist = () => {
    return this.blacklist;
  }

  setWhitelist = (wlist) => {
    //this.whitelist = wlist; // this causes "can't access dead object" error, ToDo: review/retest
    this.whitelist.length = 0;
    this.whitelist.push.apply(this.whitelist, wlist);
    this.updateAllTabs();
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
    this.redirectUrl = url;
  }

  getRedirectUrl = () => {
    return this.redirectUrl;
  }

  setDisableKeyboard = (value) => {
    this.disableKeyboard = value;
  }

  getDisableKeyboard = () => {
    return this.disableKeyboard;
  }

  enableEventHandlers = () => {
    browser.tabs.onUpdated.addListener(this.onUpdatedHandler);
    browser.tabs.onReplaced.addListener(this.onReplacedHandler);
  }

  disableEventHandlers = () => {
    browser.tabs.onUpdated.removeListener(this.onUpdatedHandler);
    browser.tabs.onReplaced.removeListener(this.onReplacedHandler);
  }

  enable = () => {
    this.enableEventHandlers();
    if (this.action === Action.blockTab) {
      browser.tabs.query({}).then((tabs) => {
        if (tabs.length > 0) {
          for (let index in tabs) {
            const tab = tabs[index];
            if (this.isDistracting(tab)) {
              this.blockTab(tab);
            }
          }
        }
      });
    }
  }

  disable = () => {
    this.disableEventHandlers();
    if (this.action === Action.blockTab) {
      browser.tabs.query({}).then((tabs) => {
        if (tabs.length > 0) {
          for (let index in tabs) {
            const tab = tabs[index];
            if (this.isDistracting(tab)) {
              this.unblockTab(tab);
            }
          }
        }
      });
    }
  }

  render() {
    return (
      <span>Silence is golden!</span>
    );
  }

}
