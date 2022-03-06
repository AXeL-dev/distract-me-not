export class regex {
  static wildcard(url) {
    if (url.indexOf('://') === -1 && !url.startsWith('^')) {
      return url.endsWith('$') ? `*://${url}` : `*://${url}/*`;
    }
    return url;
  }

  static escape(str) {
    // prettier-ignore
    const specials = [
      // order matters for these
      '-', '[', ']',
      // order doesn't matter for any of these
      '/', '{', '}', '(', ')', '*', '+', '?', '.', '\\', '^', '$', '|',
    ];
    const regex = RegExp('[' + specials.join('\\') + ']', 'g');
    return str.replace(regex, '\\$&');
  }

  static create(str, flags) {
    try {
      return new RegExp(str, flags);
    } catch (ex) {
      console.error(ex);
      return str;
    }
  }

  static parseKeyword(str) {
    const flags = ['i', 'g', 's', 'm', 'y', 'u'];
    const regex = RegExp('^/(.*)/((?!.*(.).*\\3)[' + flags.join('') + ']+)?$');
    const result = regex.exec(str);
    return result ? this.create(result[1], result[2]) : this.create(this.escape(str));
  }

  static parseUrl(url) {
    if (url.startsWith('^') /* || url.endsWith('$')*/) {
      return this.create(url, 'i');
    }
    const sanitize = (pattern) => {
      return pattern
        .replace(/^\.\*:\\\/\\\/\.\*\\\./, '.*:\\/\\/(.*\\.)?') // If "*." wildcard is after the protocol (which is equivalent to ".*\." in regex), escape it
        .replace(/\\\/\.\*$/, '(\\/|$).*') // If "/*" wildcard is at the end (which is equivalent to "\/.*" in regex), escape it
        .replace(/\\\$$/, '(\\/|$)'); // If regex ends with "\$" it means that we want to match the exact url (including trailing slash after url)
    };
    return this.create(`^${sanitize(url.split('*').map(this.escape).join('.*'))}$`, 'i');
  }
}

export function transformList(list) {
  return list.map((url) => regex.wildcard(url)).map((url) => regex.parseUrl(url));
}

export function transformKeywords(list) {
  return list.map((word) => regex.parseKeyword(word));
}
