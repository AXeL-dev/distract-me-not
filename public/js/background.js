"use strict";
var browser = browser || chrome;
var blacklist;
var whitelist;
var isWhitelistMode = false;
var isEnabled = false;
var disableKeyboard = false;
var action;
var redirectUrl;

function getDefaultWhitelist() {
    return ["wikipedia.org"];
}

function getDefaultBlacklist() {
    return ["facebook.com", "twitter.com", "youtube.com"];
}

function isAccessible(tab) {
    return typeof tab.url != "undefined" && !tab.url.startsWith("about:") && !tab.url.startsWith("file://") && !tab.url.startsWith("moz-extension://") && !tab.url.startsWith("chrome://");
}

function blockTab(tab) {
    if (isAccessible(tab)) {
        browser.tabs.sendMessage(tab.id, {
            request: "block",
            disableKeyboard: disableKeyboard
        });
    }
}

function unblockTab(tab) {
    if (isAccessible(tab)) {
        browser.tabs.sendMessage(tab.id, {
            request: "unblock"
        });
    }
}

function redirectTab(tab) {
    //console.log(redirectUrl);
    if (isAccessible(tab) && redirectUrl != '' && !tab.url.startsWith(redirectUrl)) {
        if (!redirectUrl.startsWith("about:") && !redirectUrl.startsWith("file://") && !redirectUrl.startsWith("http://") && !redirectUrl.startsWith("https://")) {
            redirectUrl = "https://" + redirectUrl;
        }
        disableEventHandlers();
        if (chrome) {
            browser.tabs.update(tab.id, {
                url: redirectUrl
            }, function() {
                enableEventHandlers();
            });
        } else {
            browser.tabs.update(tab.id, {
                url: redirectUrl,
                loadReplace: true
            }).then(function(tab) {
                enableEventHandlers();
            }, function(error) {
                enableEventHandlers();
            });
        }
    }
}

function closeTab(tab) {
    if (isAccessible(tab)) {
        browser.tabs.remove(tab.id);
    }
}

function isDistracting(tab) {
    return (isWhitelistMode && !isWhitelisted(tab)) || (!isWhitelistMode && isBlacklisted(tab));
}

function checkTab(tab) {
    //console.log('checking tab', tab);
    if (isDistracting(tab)) {
        //console.log(action);
        if (action == 'redirectToUrl') {
            redirectTab(tab);
        } else if (action == 'closeTab') {
            closeTab(tab);
        } else if (action == 'blockTab') {
            blockTab(tab);
        }
    }
}

function updateAllTabs() {
    if (isEnabled && action == 'blockTab') {
        browser.tabs.query({}, function(tabs) {
            if (tabs.length > 0) {
                for (var index in tabs) {
                    var tab = tabs[index];
                    if (isDistracting(tab)) {
                        blockTab(tab);
                    } else {
                        unblockTab(tab);
                    }
                }
            }
        });
    }
}

function onUpdatedHandler(tabId, changeInfo, tab) {
    checkTab(tab);
}

function onReplacedHandler(addedTabId, removedTabId) {
    browser.tabs.get(addedTabId, function(tab) {
        if (tab !== null) {
            checkTab(tab);
        }
    });
}

function isBlacklisted(tab) {
    if (typeof tab.url == "undefined") {
        return false;
    }
    for (var index in blacklist) {
        if (tab.url.toLowerCase().indexOf(blacklist[index].toLowerCase()) >= 0) {
            return true;
        }
    }
    return false;
}

function isWhitelisted(tab) {
    if (typeof tab.url == "undefined") {
        return true;
    }
    if (tab.url.startsWith("chrome://newtab")) {
        return true;
    }
    for (var index in whitelist) {
        if (tab.url.toLowerCase().indexOf(whitelist[index].toLowerCase()) >= 0) {
            return true;
        }
    }
    return false;
}

function setIsWhitelistMode(value) {
    isWhitelistMode = value;
    updateAllTabs();
}

function getIsWhitelistMode() {
    return isWhitelistMode;
}

function setIsEnabled(value) {
    isEnabled = value;
    if (isEnabled) {
        enable();
    } else {
        disable();
    }
}

function getIsEnabled() {
    return isEnabled;
}

function setBlacklist(blist) {
    //blacklist = blist; // this causes "can't access dead object" error
    blacklist.length = 0;
    blacklist.push.apply(blacklist, blist);
    updateAllTabs();
}

function getBlacklist() {
    return blacklist;
}

function setWhitelist(wlist) {
    //whitelist = wlist; // this causes "can't access dead object" error
    whitelist.length = 0;
    whitelist.push.apply(whitelist, wlist);
    updateAllTabs();
}

function getWhitelist() {
    return whitelist;
}

function setAction(value) {
    action = value;
}

function getAction() {
    return action;
}

function setRedirectUrl(url) {
    redirectUrl = url;
}

function getRedirectUrl() {
    return redirectUrl;
}

function setDisableKeyboard(value) {
    disableKeyboard = value;
}

function getDisableKeyboard() {
    return disableKeyboard;
}

function enableEventHandlers() {
    browser.tabs.onUpdated.addListener(onUpdatedHandler);
    browser.tabs.onReplaced.addListener(onReplacedHandler);
}

function disableEventHandlers() {
    browser.tabs.onUpdated.removeListener(onUpdatedHandler);
    browser.tabs.onReplaced.removeListener(onReplacedHandler);
}

function enable() {
    enableEventHandlers();
    if (action == 'blockTab') {
        browser.tabs.query({}, function(tabs) {
            if (tabs.length > 0) {
                for (var index in tabs) {
                    var tab = tabs[index];
                    if (isDistracting(tab)) {
                        blockTab(tab);
                    }
                }
            }
        });
    }
}

function disable() {
    disableEventHandlers();
    if (action == 'blockTab') {
        browser.tabs.query({}, function(tabs) {
            if (tabs.length > 0) {
                for (var index in tabs) {
                    var tab = tabs[index];
                    if (isDistracting(tab)) {
                        unblockTab(tab);
                    }
                }
            }
        });
    }
}

function onBrowserStartup() {
    browser.storage.local.get({
        enableOnBrowserStartup: false
    }, function(items) {
        if (items.enableOnBrowserStartup) {
            enable();
        }
    });
}

function executeFunction(functionName, ...params) {
    if (params) {
        return window[functionName](...params);
    } else {
        return window[functionName]();
    }
}

function isFunction(functionName) {
    return window[functionName] && typeof window[functionName] === 'function';
}

function handleMessage(request, sender, sendResponse) {
    //console.log("Handle message:", request);
    sendResponse({
        response: isFunction(request.message) ? executeFunction(request.message, ...request.params) : window[request.message]
    });
}

function init() {
    browser.storage.local.get({
        blackList: getDefaultBlacklist(),
        whiteList: getDefaultWhitelist(),
        whitelist: null, // for backward compatibility, ToDo: drop out
        isWhitelistMode: false,
        enableOnBrowserStartup: false,
        disableKeyboard: false,
        isEnabled: false,
        action: 'blockTab',
        redirectUrl: ''
    }, function(items) {
        blacklist = items.blackList;
        whitelist = items.whiteList;
        action = items.action;
        redirectUrl = items.redirectUrl;
        // start old whitelist recovery
        if (items.whitelist != null) {
            var old_whitelist = items.whitelist;
            browser.storage.remove("whitelist", function(items) {});
            whitelist.concat(old_whitelist);
            browser.storage.local.set({
                whiteList: whitelist
            }, function(items) {});
        }
        // end old whitelist recovery
        isWhitelistMode = items.isWhitelistMode;
        disableKeyboard = items.disableKeyboard;
        isEnabled = items.enableOnBrowserStartup ? true : items.isEnabled;
        if (!items.enableOnBrowserStartup && isEnabled) {
            enable();
        }
    });
    browser.runtime.onStartup.addListener(onBrowserStartup);
    browser.runtime.onMessage.addListener(handleMessage);
}

init();
