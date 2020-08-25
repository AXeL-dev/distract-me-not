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

function download(blob, filename) {
    if (window.navigator.msSaveOrOpenBlob) { // IE10+
      window.navigator.msSaveOrOpenBlob(blob, filename);
    } else { // Others
      var a = document.createElement('a'),
          url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function() {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);  
      }, 0);
    }
}

function readFile(file) {
    return new Promise(function(resolve, reject) {
        var fileReader = new FileReader();
        fileReader.readAsText(file, 'UTF-8');
        fileReader.onload = function() {
            resolve(fileReader.result);
        };
        fileReader.onerror = function(error) {
            reject(error);
        };
    });
}
