const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  webpack: {
    plugins: [
      new CopyPlugin([
        {
          from: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
          to: 'static/js',
        },
        {
          from: 'node_modules/bcryptjs/dist/bcrypt.min.js',
          to: 'static/js',
        },
      ]),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 1,
      }),
    ],
    configure: (webpackConfig, { paths }) => {
      // allow public / non relative assets (like public/_locales) to be loaded
      const folder = 'public';
      const absolutePath = path.join(paths.appPath, folder);
      const moduleScopePlugin = webpackConfig.resolve.plugins.find(
        ({ constructor }) => constructor && constructor.name === 'ModuleScopePlugin'
      );

      if (moduleScopePlugin) {
        moduleScopePlugin.appSrcs.push(absolutePath);
      }

      webpackConfig.resolve.alias = Object.assign(webpackConfig.resolve.alias, {
        [folder]: absolutePath,
      });

      // override output filenames (remove file hashes)
      // it seems like build location can influence files hashes (even if files content doesn't change)
      // @see https://github.com/facebook/create-react-app/issues/5526 & https://github.com/webpack/webpack/issues/8419
      webpackConfig.output.filename = 'static/js/[name].js';
      webpackConfig.output.chunkFilename = 'static/js/[name].chunk.js';

      const miniCssExtractPlugin = webpackConfig.plugins.find(
        ({ constructor }) => constructor && constructor.name === 'MiniCssExtractPlugin'
      );
      if (miniCssExtractPlugin) {
        miniCssExtractPlugin.options.filename = 'static/css/[name].css';
        miniCssExtractPlugin.options.chunkFilename = 'static/css/[name].chunk.css';
      }

      const rulesIndex = webpackConfig.module.rules.findIndex((rule) => rule.oneOf);
      if (rulesIndex !== -1) {
        webpackConfig.module.rules[rulesIndex].oneOf = webpackConfig.module.rules[rulesIndex].oneOf.map((rule) => {
          if (rule.options && rule.options.name && rule.options.name.endsWith('.[ext]')) {
            rule.options.name = rule.options.name.replace(/\.\[hash:\d+\]/, '');
          }
          return rule;
        });
      }

      return webpackConfig;
    },
  },
};
