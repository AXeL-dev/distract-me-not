"use strict";
var hasClass = function(el, cls) {
    if (el.nodeName == "#text") {
        return false;
    }
    return el.className.match(new RegExp("(\\s|^)" + cls + "(\\s|$)")) ? true : false;
};

var addClass = function(el, cls) {
    if (!hasClass(el, cls)) {
        el.className += " " + cls;
    }
};

var removeClass = function(el, cls) {
    if (hasClass(el, cls)) {
        var reg = new RegExp("(\\s|^)" + cls + "(\\s|$)");
        el.className = el.className.replace(reg, " ");
    }
};

var replaceClass = function(el, cls, newcls) {
    if (hasClass(el, cls)) {
        el.className = el.className.replace(" " + cls, newcls);
    }
};

function setText(element, text) {
    document.getElementById(element).textContent = text;
}
