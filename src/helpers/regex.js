
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
    const escapeRegexp = str => {
      const specials = [
        // order matters for these
        '-', '[', ']',
        // order doesn't matter for any of these
        '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|'
      ];
      const regex = RegExp('[' + specials.join('\\') + ']', 'g');
      return str.replace(regex, '\\$&');
    };
    return new RegExp('^' + url.split('*').map(escapeRegexp).join('.*') + '$', 'i');
  }

}
