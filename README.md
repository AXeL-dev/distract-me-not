# ![icon](public/icons/magnet-32.png) Distract Me Not <img align="right" src="screenshots/panel.png">

[![Mozilla Add-on version](https://img.shields.io/amo/v/distract-me-not.svg?logo=mozilla&label=&labelColor=grey)](https://addons.mozilla.org/firefox/addon/distract-me-not/?src=external-github-shield-downloads)
[![Mozilla Add-on downloads](https://img.shields.io/amo/dw/distract-me-not.svg)](https://addons.mozilla.org/firefox/addon/distract-me-not/?src=external-github-shield-downloads)
[![Mozilla Add-on users](https://img.shields.io/amo/users/distract-me-not.svg)](https://addons.mozilla.org/firefox/addon/distract-me-not/statistics/)
[![Mozilla Add-on stars](https://img.shields.io/amo/stars/distract-me-not.svg)](https://addons.mozilla.org/firefox/addon/distract-me-not/reviews/)
[![Donate](https://img.shields.io/badge/PayPal-grey.svg?style=flat&logo=paypal&labelColor=grey&color=168CC2)](https://www.paypal.me/axeldev)

> **Stay focused in a world full of distractions.**

Distract Me Not is a lightweight website blocker with a user friendly interface.

## Features

- Prevent access to a range of websites.
- Whitelist & blacklist mode.
- Custom page redirection.
- Display your custom message on blocked pages.
- Immediate closing of blocked tabs.
- Schedule blocking time.
- Timer mode.
- Export/Import websites lists.
- Protect your settings with a password.
- Unblock websites using a password.

## Installation

[![Get it for Firefox!](https://i.imgur.com/TMOLdK6.png)](https://addons.mozilla.org/firefox/addon/distract-me-not/?src=external-github-download)
[![Get it for Edge!](https://i.imgur.com/n49Wiu2.png)](https://microsoftedge.microsoft.com/addons/detail/distract-me-not/bonjdhkkkokfmnmnkpgkakhkiccnllba)
[![Get it for Chrome!](https://i.imgur.com/B0i5sn3.png)](https://chrome.google.com/webstore/detail/distract-me-not/lkmfokajfoplgdkdifijpffkjeejainc)

## Development

### Building for different browsers

This extension can be built for different browsers with specific adaptations for each platform:

- Firefox: `npm run build:firefox`
- Chrome: `npm run build:chrome`
- Edge: `npm run build:edge`

#### Browser-specific build notes

- **Chrome** builds require special handling of external libraries due to Content Security Policy restrictions. The build process:
  1. Copies the required libraries to the output directory
  2. Updates the HTML to reference them externally instead of inlining
  3. Modifies the service worker to properly load the libraries

- **Firefox** and **Edge** builds use a simpler approach that also works well across these platforms.

Or download it from [github releases](https://github.com/AXeL-dev/distract-me-not/releases/latest).

[How to install?](https://github.com/AXeL-dev/install-webextension)

## Technical

### Stack

- [React](https://reactjs.org/): Core library
- [evergreen-ui](https://evergreen.segment.com/): UI toolkit
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js): Encryption library
- [fuzzaldrin-plus](https://github.com/jeancroy/fuzz-aldrin-plus): Data filtering library
- [query-string](https://github.com/sindresorhus/query-string): URL query strings parsing library
- [date-fns](https://date-fns.org): Date manipulation library
- [lodash](https://lodash.com): Utility library
- [omgopass](https://github.com/omgovich/omgopass): Password generator

### Scripts

In the project directory, you can run:

#### `npm start`

Runs the app in the development mode.<br />
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.<br />
You will also see any lint errors in the console.

#### `npm test`

Launches the test runner in the interactive watch mode.<br />
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

#### `npm run build`

Builds the app for production to the `build` folder.<br />
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.<br />
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

**Note:** for Firefox builds it's recommended to add the `:firefox` suffix to the build command like so `npm run build:firefox`.

#### `npm run package`

Packages the app in a zip file.

**Note:** the web-ext package is required. You can install it using `npm install -g web-ext`.

### Pattern matching notes

The extension uses pattern matching to determine which websites should be blocked or allowed. The following formats are supported:

#### Domain patterns
- Simple domain names: `example.com` - Matches the domain and all subdomains
- Wildcard domains: `*.example.com` - Matches all subdomains but not the root domain
- Case-insensitive: Both `EXAMPLE.COM` and `example.com` will work the same

#### URL patterns
- Full URLs: `https://example.com/path` - Matches exact URL only
- URLs with wildcards: `https://example.com/*` - Matches all pages on the site
- Path patterns: `example.com/path*` - Matches paths starting with the specified prefix

#### Troubleshooting pattern matching
If a website isn't being blocked as expected:
1. Check the browser console for logs starting with `[DMN INFO]`
2. Try adding the domain in multiple formats (with and without wildcards)
3. For complex domains, you can try the URL pattern format
4. If a specific TLD isn't working, try adding rules for alternate TLDs

## Credits

Icon made by [Smashicons](https://www.flaticon.com/authors/smashicons) from [Flaticon](https://www.flaticon.com/).

## License

Distract Me Not is licensed under the [MIT license](LICENSE).
