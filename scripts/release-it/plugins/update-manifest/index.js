const { Plugin } = require('release-it');
const fs = require('fs');
const glob = require('glob');

class UpdateManifestPlugin extends Plugin {
  getLatestVersion() {
    const json = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    return json.version;
  }

  bump(version) {
    glob.sync('./public/manifest*.json').forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const newContent = content.replace(/^(\s*"version": ").+(",$\s*)/gm, `$1${version}$2`);
      fs.writeFileSync(file, newContent);
    });
  }
}

module.exports = UpdateManifestPlugin;
