
export class regex {

  static wildcard(url) {
    if (url.indexOf('://') === -1 && !url.startsWith('^')) {
      return `*://${url}/*`;
    }
    return url;
  }

  static new(url) {
    if (url.startsWith('^')) {
      return new RegExp(url, 'i');
    }
    const escapeRegex = str => {
      const specials = [
        // order matters for these
        '-', '[', ']',
        // order doesn't matter for any of these
        '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
      ];
      const regex = RegExp('[' + specials.join('\\') + ']', 'g');
      return str.replace(regex, '\\$&');
    };
    const sanitizeRegex = regex => {
      return regex.replace(/^\.\*:\\\/\\\/\.\*\\\./, '.*:\\/\\/(.*\\.)?') // If "*." wildcard is after the protocol (which is equivalent to ".*\." in regex), escape it
                  .replace(/\\\/\.\*$/, '(\\/|$).*'); // If "/*" wildcard is at the end (which is equivalent to "\/.*" in regex), escape it
    };
    return new RegExp('^' + sanitizeRegex(url.split('*').map(escapeRegex).join('.*')) + '$', 'i');
  }

}
