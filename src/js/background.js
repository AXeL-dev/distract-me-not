"use strict";
var blacklist;
var whitelist;
var isWhitelistMode = false;

function getDefaultWhitelist() {
    return ["wikipedia.org"]
}

function getDefaultBlacklist() {
    return ["facebook.com", "twitter.com", "youtube.com"]
}

function isTab(tab) {
    return typeof tab.url == "undefined" || tab.url.startsWith("about:") || tab.url.startsWith("moz-extension://") ? false : true;
}

function block(tab) {
    if (isTab(tab)) {
        browser.tabs.sendMessage(tab.id, "block");
    }
}

function unblock(tab) {
    if (isTab(tab)) {
        browser.tabs.sendMessage(tab.id, "unblock");
    }
}

function checkForBlacklistAccess(tabId, changeInfo, tab) {
    if (!isWhitelistMode) {
        if (isBlacklisted(tab)) {
            block(tab);
        } else {
            unblock(tab);
        }
    }
}

function checkForWhitelistAccess(tabId, changeInfo, tab) {
    if (isWhitelistMode) {
        if (!isWhitelisted(tab)) {
            block(tab);
        } else {
            unblock(tab);
        }
    }
}

function onReplacedHandler(addedTabId, removedTabId) {
    browser.tabs.get(addedTabId, function(tab) {
        if (tab !== null) {
            checkForBlacklistAccess(tab.id, null, tab);
            checkForWhitelistAccess(tab.id, null, tab);
        }
    })
}

function isBlacklisted(tab) {
    if (typeof tab.url == "undefined") {
        return false;
    }
    for (var index in blacklist) {
        if (tab.url.indexOf(blacklist[index].toLowerCase()) >= 0) {
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
        if (tab.url.indexOf(whitelist[index].toLowerCase()) >= 0) {
            return true;
        }
    }
    return false;
}

function setWhitelistMode(isWLMode) {
    isWhitelistMode = isWLMode;
}

function getIsWhitelistMode() {
    return isWhitelistMode;
}

function setBlacklist(blist) {
    //blacklist = blist; // this causes "can't access dead object" error
    blacklist.length = 0;
    blacklist.push.apply(blacklist, blist);
}

function getBlacklist() {
    return blacklist;
}

function setWhitelist(wlist) {
    //whitelist = wlist; // this causes "can't access dead object" error
    whitelist.length = 0;
    whitelist.push.apply(whitelist, wlist);
}

function getWhitelist() {
    return whitelist;
}

function enable() {
    browser.tabs.onUpdated.addListener(checkForBlacklistAccess);
    browser.tabs.onUpdated.addListener(checkForWhitelistAccess);
    browser.tabs.onReplaced.addListener(onReplacedHandler);
}

function disable() {
    browser.tabs.onUpdated.removeListener(checkForBlacklistAccess);
    browser.tabs.onUpdated.removeListener(checkForWhitelistAccess);
    browser.tabs.onReplaced.removeListener(onReplacedHandler);
}

function init() {
    browser.storage.local.get({
        blackList: getDefaultBlacklist(),
        whiteList: getDefaultWhitelist(),
        whitelist: null,
        isWhitelistMode: false
    }, function(items) {
        blacklist = items.blackList;
        whitelist = items.whiteList;
        if (items.whitelist != null) {
            var old_whitelist = items.whitelist;
            browser.storage.remove("whitelist", function(items) {});
            whitelist.concat(old_whitelist);
            browser.storage.local.set({
                whiteList: whitelist
            }, function(items) {});
        }
        isWhitelistMode = items.isWhitelistMode;
        enable();
    });
}

init();
