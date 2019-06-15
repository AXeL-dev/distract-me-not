(function() {
    "use strict";
    var browser = browser || chrome;
    var bgpage = browser.extension.getBackgroundPage();

    function toggleAddIcon(isWhitelistMode) {
        browser.tabs.query({
            active: true,
            lastFocusedWindow: true
        }, function(tabs) {
            var tab = tabs[0];
            if (!bgpage.isAccessible(tab) || (!isWhitelistMode && bgpage.isBlacklisted(tab)) || (isWhitelistMode && bgpage.isWhitelisted(tab))) {
                addClass(document.getElementById("add-to-blacklist-icon"), "hidden");
            } else {
                removeClass(document.getElementById("add-to-blacklist-icon"), "hidden");
            }
        });
    }

    function init() {
        setText("app_name", browser.i18n.getMessage("appName"));
        setText("main_settings_tooltip", browser.i18n.getMessage("main_settings_tooltip"));
        if (bgpage != null)
        {
            var isWhitelistMode = bgpage.getIsWhitelistMode();
            setText("main_add_blacklist_tooltip", isWhitelistMode ? browser.i18n.getMessage("main_add_whitelist_tooltip") : browser.i18n.getMessage("main_add_blacklist_tooltip"));
            setText("main_status", browser.i18n.getMessage("main_status"));
            setText("main_mode", browser.i18n.getMessage("main_mode"));
            setText("mode_blacklist_title", browser.i18n.getMessage("settings_blacklist_title"));
            setText("mode_whitelist_title", browser.i18n.getMessage("settings_whitelist_title"));
            var statusSwitch = document.getElementById("status-switch");
            statusSwitch.checked = bgpage.getIsEnabled() ? true : false;
            var blacklistSwitch = document.getElementById("blacklist-switch");
            var whitelistSwitch = document.getElementById("whitelist-switch");
            if (isWhitelistMode) {
                blacklistSwitch.checked = false;
                whitelistSwitch.checked = true;
            } else {
                blacklistSwitch.checked = true;
                whitelistSwitch.checked = false;
            }
            toggleAddIcon(isWhitelistMode);
        }
        else
        {
            var optionsContainer = document.getElementById("options-container");
            var blacklistContainer = document.getElementById("blacklist-container");

            optionsContainer.innerHTML = browser.extension.inIncognitoContext ? browser.i18n.getMessage("private_mode") : browser.i18n.getMessage("panel_issue");
            blacklistContainer.parentNode.removeChild(blacklistContainer);
        }
    }

    window.addEventListener("click", function(event) {
        var t = event.target;
        if (t.id == "add-to-blacklist-icon" && hasClass(t, "buttons")) {
            browser.tabs.query({
                active: true,
                lastFocusedWindow: true
            }, function(tabs) {
                var tab = tabs[0];
                var parserA = document.createElement("a");
                parserA.href = tab.url;
                var host = parserA.hostname;
                if (host != null) {
                    if (bgpage.getIsWhitelistMode()) {
                        browser.storage.local.get({
                            whiteList: bgpage.getDefaultWhitelist()
                        }, function(items) {
                            var whitelist = items.whiteList;
                            for (var index in whitelist) {
                                if (whitelist[index].indexOf(host) >= 0) {
                                    return;
                                }
                            }
                            whitelist.splice(0, 0, host);
                            bgpage.setWhitelist(whitelist);
                            browser.storage.local.set({
                                whiteList: whitelist
                            }, function() {});
                        })
                    } else {
                        browser.storage.local.get({
                            blackList: bgpage.getDefaultBlacklist()
                        }, function(items) {
                            var blacklist = items.blackList;
                            for (var index in blacklist) {
                                if (blacklist[index].indexOf(host) >= 0) {
                                    return;
                                }
                            }
                            blacklist.splice(0, 0, host);
                            bgpage.setBlacklist(blacklist);
                            browser.storage.local.set({
                                blackList: blacklist
                            }, function() {});
                        })
                    }
                }
            });
            var atbIcon = document.getElementById("add-to-blacklist-icon");
            removeClass(atbIcon, "buttons");
            setTimeout(function() {
                addClass(atbIcon, "convergeToPoint");
                setTimeout(function() {
                    addClass(atbIcon, "checked");
                    removeClass(atbIcon, "convergeToPoint");
                    setTimeout(function() {
                        addClass(atbIcon, "convergeToPoint");
                        setTimeout(function() {
                            addClass(atbIcon, "hidden");
                            removeClass(atbIcon, "checked");
                            removeClass(atbIcon, "convergeToPoint");
                            addClass(atbIcon, "buttons");
                        }, 200)
                    }, 500)
                }, 200)
            }, 100);
        }
        else if (t.id == "setting-icon") {
            setTimeout(function() {
                browser.runtime.openOptionsPage(null);
                window.close();
            }, 100);
        }
        else if (t.id == "status-switch") {
            var value = t.checked;
            bgpage.setIsEnabled(value);
            browser.storage.local.set({
                isEnabled: value
            }, function() {});
        }
        else if ((t.id == "blacklist-switch" && bgpage.getIsWhitelistMode()) || (t.id == "whitelist-switch" && !bgpage.getIsWhitelistMode())) {
            var isWhitelistMode = t.id == "blacklist-switch" && t.checked ? false : true;
            bgpage.setIsWhitelistMode(isWhitelistMode);
            browser.storage.local.set({
                isWhitelistMode: isWhitelistMode
            }, function() {});
            toggleAddIcon(isWhitelistMode);
            setText("main_add_blacklist_tooltip", isWhitelistMode ? browser.i18n.getMessage("main_add_whitelist_tooltip") : browser.i18n.getMessage("main_add_blacklist_tooltip"));
        }
    }, false);

    window.addEventListener("contextmenu", function(event) {
        event.preventDefault();
        return false;
    }, true);

    window.onload = init;
})();
