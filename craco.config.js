const path = require('path');

module.exports = {
  plugins: [
    {
      plugin: {
        overrideWebpackConfig: ({ webpackConfig, context: { paths } }) => {
          // allow public / non relative assets (like public/_locales) to be loaded
          const folder = 'public';
          const absolutePath = path.join(paths.appPath, folder);
          const moduleScopePlugin = webpackConfig.resolve.plugins.find(
            (plugin) => plugin.appSrcs && plugin.allowedFiles
          );

          if (moduleScopePlugin) {
            moduleScopePlugin.appSrcs.push(absolutePath);
          }

          webpackConfig.resolve.alias = Object.assign(
            webpackConfig.resolve.alias,
            { [folder]: absolutePath }
          );

          // override output filenames (removed file hashes)
          // it seems like build location can influence files hashes (even if files content doesn't change)
          // @see https://github.com/facebook/create-react-app/issues/5526 & https://github.com/webpack/webpack/issues/8419
          webpackConfig.output.filename = 'static/js/[name].js';
          webpackConfig.output.chunkFilename = 'static/js/[name].chunk.js';
          webpackConfig.plugins[4].options.filename = 'static/css/[name].css';
          webpackConfig.plugins[4].options.chunkFilename = 'static/css/[name].chunk.css';
          webpackConfig.module.rules[1].oneOf[0].options.name = 'static/media/[name].[ext]';
          webpackConfig.module.rules[1].oneOf[1].options.name = 'static/media/[name].[ext]';
          webpackConfig.module.rules[1].oneOf[8].options.name = 'static/media/[name].[ext]';

          return webpackConfig;
        },
      },
    },
  ],
};
