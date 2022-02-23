// @source: https://github.com/mozilla/sign-addon

const { signAddon } = require('sign-addon');
const fs = require('fs');

const manifestJson = fs.readFileSync('public/manifest.firefox.json');
const manifest = JSON.parse(manifestJson);

signAddon({
  // Required arguments:

  xpiPath: `distract_me_not-${manifest.version}.zip`,
  version: manifest.version,
  apiKey: process.env.AMO_JWT_ISSUER,
  apiSecret: process.env.AMO_JWT_SECRET,

  // Optional arguments:

  // The explicit extension ID.
  // WebExtensions do not require an ID.
  // See the notes below about dealing with IDs.
  id: manifest.browser_specific_settings.gecko.id,
  // The release channel (listed or unlisted).
  // Ignored for new add-ons, which are always unlisted.
  // Default: most recently used channel.
  channel: 'unlisted',
  // Save downloaded files to this directory.
  // Default: current working directory.
  //downloadDir: undefined,
  // Number of milliseconds to wait before aborting the request.
  // Default: 15 minutes.
  //timeout: undefined,
  // Optional proxy to use for all API requests,
  // such as "http://yourproxy:6000"
  // Read this for details on how proxy requests work:
  // https://github.com/request/request#proxies
  //apiProxy: undefined,
  // Optional object to pass to request() for additional configuration.
  // Some properties such as 'url' cannot be defined here.
  // Available options:
  // https://github.com/request/request#requestoptions-callback
  //apiRequestConfig: undefined,
  // Optional override to the number of seconds until the JWT token for
  // the API request expires. This must match the expiration time that
  // the API server accepts.
  //apiJwtExpiresIn: undefined,
  // Optional override to the URL prefix of the signing API.
  // The production instance of the API will be used by default.
  apiUrlPrefix: 'https://addons.mozilla.org/api/v4',
})
.then(function (result) {
  if (result.success) {
    console.log('The following signed files were downloaded:');
    console.log(result.downloadedFiles);
    console.log('Your extension ID is:');
    console.log(result.id);
  } else {
    console.error('Your add-on could not be signed!');
    console.error('Error code: ' + result.errorCode);
    console.error('Details: ' + result.errorDetails);
  }
  console.log(result.success ? 'SUCCESS' : 'FAIL');
})
.catch(function (error) {
  console.error('Signing error:', error);
});
