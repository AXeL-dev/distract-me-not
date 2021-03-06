
export function isUrl(url) {
  return url.match(/(^|\s)((https?:\/\/)?(localhost(:\d+)?$|(\*?|[\w-]+)(\.[\w-]+)+\.?(:\d+)?(\/\S*)?))/gi);
}

export function getHostName(url) {
  return getDomainName(url).split('.').slice(-2).join('.'); //.replace(/^w+\./i, '');
}

export function getDomainName(url) {
  const matches = url.match(/^(?:https?:)?(?:\/\/)?([^/?]+)/i); // or: /^https?\:\/\/([^/?#]+)(?:[/?#]|$)/i
  return matches ? matches[1] : url;
}

export function getFaviconLink(url) {
  return `https://${getHostName(url).replace(/\$$/, '')}/favicon.ico`;
}

export function checkFaviconLink(faviconLink) {
  return new Promise(resolve => {
    const image = new Image();
    image.onload = function() {
      resolve(true); 
    };
    image.onerror = function() {
      resolve(false);
    };
    image.src = faviconLink;
  });
}

export function hasValidProtocol(url) {
  return /^(?:ftps?|https?|file):\/\//i.test(url) || url.startsWith("about:");
}

export function getValidUrl(url) {
  if (url && url.length && !hasValidProtocol(url)) {
    return "https://" + url;
  }
  return url;
}
