(function() {
    "use strict";
    var browser = browser || chrome;
    var bgpage = browser.extension.getBackgroundPage();

    var saveList = function(listType) {
        var list = [];
        var bChilds;
        switch (listType) {
            case "blacklist":
                bChilds = document.getElementById("blacklist").children;
                break;
            case "whitelist":
                bChilds = document.getElementById("whitelist").children;
                break;
            default:
        }
        for (var index in bChilds) {
            var tmpLi = bChilds[index];
            if (typeof tmpLi.id !== "undefined" && !tmpLi.id.startsWith("new")) {
                var childs = tmpLi.children;
                for (var cIndex in childs) {
                    if (childs[cIndex].nodeName === "SPAN") {
                        list.push(childs[cIndex].textContent);
                        break;
                    }
                }
            }
        }
        switch (listType) {
            case "blacklist":
                bgpage.setBlacklist(list);
                browser.storage.local.set({
                    blackList: list
                }, function() {});
                break;
            case "whitelist":
                bgpage.setWhitelist(list);
                browser.storage.local.set({
                    whiteList: list
                }, function() {});
                break;
            default:
        }
    };

    var addToList = function(listType, url) {
        var list, newBox;
        switch (listType) {
            case "blacklist":
                list = document.getElementById("blacklist");
                newBox = document.getElementById("new-black");
                break;
            case "whitelist":
                list = document.getElementById("whitelist");
                newBox = document.getElementById("new-white");
                break;
            default:
        }
        var newLi = document.createElement("LI");
        var x = document.createElement("IMG");
        x.src = "icons/delete.png";
        x.className = "x buttons";
        x.alt = "X";
        newLi.appendChild(x);
        newLi.appendChild(document.createTextNode("  "));
        var fav = document.createElement("IMG");
        fav.src = "http://" + url + "/favicon.ico";
        fav.className = "favicon";
        fav.addEventListener("error", function(event) {
            this.src = "icons/favicon.png"
        }, false);
        newLi.appendChild(fav);
        newLi.appendChild(document.createTextNode("  "));
        var domain = document.createElement("SPAN");
        domain.textContent = url;
        newLi.appendChild(domain);
        list.insertBefore(newLi, newBox.nextElementSibling);
    };

    var inList = function(listType, url) {
        var list;
        switch (listType) {
            case "blacklist":
                list = bgpage.getBlacklist();
                break;
            case "whitelist":
                list = bgpage.getWhitelist();
                break;
            default:
        }
        for (var index in list) {
            if (list[index].toLowerCase() === url.toLowerCase()) {
                return true;
            }
        }
        return false;
    };

    var isUrl = function(url) {
        var regex = /(^|\s)((https?:\/\/)?[\w-]+(\.[\w-]+)+\.?(:\d+)?(\/\S*)?)/gi;
        return url.match(regex);
    };

    var addBlacklist = function(event) {
        var t = document.getElementById("new-black-box");
        var url = t.value.trim();
        if (url.length >= 0 && isUrl(url) && !inList("blacklist", url)) {
            addToList("blacklist", url);
            saveList("blacklist");
        }
        t.value = "";
    };

    var addWhitelist = function(event) {
        var t = document.getElementById("new-white-box");
        var url = t.value.trim();
        if (url.length >= 0 && isUrl(url) && !inList("whitelist", url)) {
            addToList("whitelist", url);
            saveList("whitelist");
        }
        t.value = "";
    };

    var chooseMode = function(event) {
        var t = event.target;
        var blist = document.getElementById("blacklist");
        var wlist = document.getElementById("whitelist");
        if (t.id == "blacklist-toggle") {
            addClass(wlist, "disappear");
            removeClass(blist, "disappear");
            addClass(document.getElementById("settings-whitelist-description"), "disappear");
            removeClass(document.getElementById("settings-blacklist-description"), "disappear");
        } else if (t.id == "whitelist-toggle") {
            addClass(blist, "disappear");
            removeClass(wlist, "disappear");
            removeClass(document.getElementById("settings-whitelist-description"), "disappear");
            addClass(document.getElementById("settings-blacklist-description"), "disappear");
        }
        var isWhitelistMode = t.id === "whitelist-toggle" ? true : false;
        bgpage.setIsWhitelistMode(isWhitelistMode);
        browser.storage.local.set({
            isWhitelistMode: isWhitelistMode
        }, function() {});
    };

    function initList() {
        browser.storage.local.get({
            blackList: bgpage.getDefaultBlacklist(),
            whiteList: bgpage.getDefaultWhitelist(),
            isWhitelistMode: false
        }, function(items) {
            var blacklist = items.blackList;
            var blacklistElement = document.getElementById("blacklist");
            var bChilds;
            bChilds = blacklistElement.children;
            while (blacklistElement.lastChild.id !== "new-black") {
                blacklistElement.removeChild(blacklistElement.lastChild);
            }
            for (var bIndex in blacklist) {
                addToList("blacklist", blacklist[blacklist.length - bIndex - 1]);
            }
            var whitelist = items.whiteList;
            var whitelistElement = document.getElementById("whitelist");
            bChilds = whitelistElement.children;
            while (whitelistElement.lastChild.id !== "new-white") {
                whitelistElement.removeChild(whitelistElement.lastChild);
            }
            for (var wIndex in whitelist) {
                addToList("whitelist", whitelist[whitelist.length - wIndex - 1]);
            }
        });
    }

    window.onload = function() {
        window.addEventListener("click", function(event) {
            var t = event.target;
            if (hasClass(t, "x")) {
                var listType = t.parentNode.parentNode.id;
                t.parentNode.parentNode.removeChild(t.parentNode);
                saveList(listType);
            }
            if (hasClass(t, "choose-mode")) {
                chooseMode(event);
            }
        }, false);
        window.addEventListener("contextmenu", function(event) {
            event.preventDefault();
            return false;
        }, true);
        document.getElementById("new-black-box").addEventListener("keypress", function(e) {
            if (!e) {
                e = window.event;
            }
            var keyCode = e.keyCode || e.which;
            if (keyCode === 13) {
                addBlacklist();
                document.getElementById("new-black-box").blur();
            }
        }, false);
        document.getElementById("new-white-box").addEventListener("keypress", function(e) {
            if (!e) {
                e = window.event;
            }
            var keyCode = e.keyCode || e.which;
            if (keyCode === 13) {
                addWhitelist();
                document.getElementById("new-white-box").blur();
            }
        }, false);
        initList();
        browser.storage.local.get({
            isWhitelistMode: false
        }, function(items) {
            if (items.isWhitelistMode) {
                document.getElementById("whitelist-toggle").click();
            } else {
                document.getElementById("blacklist-toggle").click();
            }
        });
        setText("settings_blacklist_title", browser.i18n.getMessage("settings_blacklist_title"));
        setText("settings_whitelist_title", browser.i18n.getMessage("settings_whitelist_title"));
        document.getElementById("new-black-box").placeholder = browser.i18n.getMessage("settings_newblackbox_placeholder");
        document.getElementById("new-white-box").placeholder = browser.i18n.getMessage("settings_newblackbox_placeholder");
        setText("settings-whitelist-description", browser.i18n.getMessage("settings_whitelist_description"));
        setText("settings-blacklist-description", browser.i18n.getMessage("settings_blacklist_description"));
    }
})();
