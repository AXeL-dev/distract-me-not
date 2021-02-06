
module.exports = config => {
  // allow public / non relative assets (like public/_locales) to be loaded
  const scopePluginIndex = config.resolve.plugins.findIndex(
    ({ constructor }) => constructor && constructor.name === "ModuleScopePlugin"
  );

  config.resolve.plugins.splice(scopePluginIndex, 1);

  // override output filenames (removed file hashes)
  // it seems like build location can influence files hashes (even if files content doesn't change)
  // @see https://github.com/facebook/create-react-app/issues/5526 & https://github.com/webpack/webpack/issues/8419
  config.output.filename = 'static/js/[name].js';
  config.output.chunkFilename = 'static/js/[name].chunk.js';
  config.plugins[4].options.filename = 'static/css/[name].css';
  config.plugins[4].options.chunkFilename = 'static/css/[name].chunk.css';
  //config.plugins[7].config.precacheManifestFilename = 'precache-manifest.js';
  config.module.rules[2].oneOf[0].options.name = 'static/media/[name].[ext]';
  config.module.rules[2].oneOf[7].options.name = 'static/media/[name].[ext]';

  return config;
};
