const path = require('path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

// Base configuration shared by all configs
const baseConfig = {
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true, // Removes console statements
          },
          format: {
            comments: false, // Removes comments
          },
        },
        extractComments: false, // Removes comments from the output file
      }),
    ],
  },
};

// Configuration for the main script
const mainConfig = {
  ...baseConfig,
  entry: {
    prefetcher: './src/prefetcherGlobal.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'prefetcher.js'
  },
  target: 'web', // Target web environment
  plugins: [
    new webpack.DefinePlugin({
      'process.env.TESTING': JSON.stringify(process.env.NODE_ENV === 'test')
    }),
  ],
};

// Configuration for the service worker
const serviceWorkerConfig = {
  ...baseConfig,
  entry: {
    'prefetcher-service-worker': './src/prefetcherServiceWorker.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'prefetcher-service-worker.js'
  },
  target: 'webworker', // Target webworker environment
};

// Export both configurations as an array
module.exports = [mainConfig, serviceWorkerConfig];
