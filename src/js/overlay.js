(function() {
    "use strict";
    var browser = browser || chrome;
    var isActive = false;

    function disableKeyboard(e) {
        if (!isActive) {
            return true;
        }
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
    }

    function disableOverlay() {
        isActive = false;
        var overlayContainer = document.getElementById("distract-overlay-container");
        if (typeof overlayContainer != "undefined" && overlayContainer !== null) {
            overlayContainer.className = overlayContainer.className + " distract-overlay-fadeout";
            window.setTimeout(function() {
                overlayContainer.parentNode.removeChild(overlayContainer);
                document.body.className = document.body.className.replace(/distract-body/g, " ");
            }, 300);
        }
    }

    function overlay() {
        if (typeof document.body == "undefined" || document.body === null) {
            return;
        }
        if (document.body.className.indexOf("distract-body") < 0) {
            document.body.className = document.body.className + " distract-body ";
        }
        var overlayContainer = document.getElementById("distract-overlay-container");
        if (typeof overlayContainer == "undefined" || overlayContainer === null) {
            overlayContainer = document.createElement("div");
            overlayContainer.id = "distract-overlay-container";
            document.body.appendChild(overlayContainer);
        }
        overlayContainer.className = "distract-cursor distract-select distract-overlay-container";
        var overlay = document.getElementById("distract-overlay");
        if (typeof overlay == "undefined" || overlay === null) {
            overlay = document.createElement("div");
            overlay.id = "distract-overlay";
            overlayContainer.appendChild(overlay);
        }
        overlay.className = "distract-cursor distract-select distract-overlay";
        var infoContainer = document.getElementById("distract-info-container");
        if (typeof infoContainer == "undefined" || infoContainer === null) {
            infoContainer = document.createElement("div");
            infoContainer.id = "distract-info-container";
            overlay.appendChild(infoContainer);
        }
        infoContainer.className = "distract-cursor distract-select distract-info-container";
        var overlayTopText = document.getElementById("distract-overlay-top-text");
        if (typeof overlayTopText == "undefined" || overlayTopText === null) {
            overlayTopText = document.createElement("span");
            overlayTopText.id = "distract-overlay-top-text";
            infoContainer.appendChild(overlayTopText);
        }
        overlayTopText.textContent = browser.i18n.getMessage("overlay_message");
        overlayTopText.className = "distract-cursor distract-select distract-overlay-top-text";
        var overlayImg = document.getElementById("distract-overlay-img");
        if (typeof overlayImg == "undefined" || overlayImg === null) {
            overlayImg = document.createElement("div");
            overlayImg.id = "distract-overlay-img";
            infoContainer.appendChild(overlayImg);
        }
        overlayImg.className = "distract-cursor distract-select distract-overlay-img";
    }

    window.addEventListener("keydown", disableKeyboard, true);
    window.addEventListener("keypress", disableKeyboard, true);
    window.addEventListener("keyup", disableKeyboard, true);
    browser.runtime.onMessage.addListener(function(message) {
        if (message.request === "block") {
            overlay();
            isActive = true;
        } else {
            disableOverlay();
        }
    });
})();
