// @ts-check

const webpack = require('webpack');
const path = require('path');
const nodeExternals = require('webpack-node-externals');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');
const { StartServerPlugin } = require('@meyer/start-server-webpack-plugin');
const MemoryFS = require('memory-fs');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

class MemoryFSPlugin {
  constructor() {
    this.outputFS = new MemoryFS();
  }

  apply(compiler) {
    compiler.outputFileSystem = this.outputFS;
  }
}

/** @type {(env: { dev?: boolean }, options: { hot?: boolean }) => Promise<webpack.Configuration>} */
module.exports = async (env = {}, options = {}) => {
  const DEV_MODE = true; //env.dev || process.env.npm_lifecycle_event === 'start';
  const NODE_ENV = DEV_MODE ? 'development' : 'production';

  return {
    mode: NODE_ENV,
    node: {
      __dirname: false,
      __filename: false,
    },
    resolve: {
      extensions: ['.js', '.json', '.ts', '.tsx'],
      plugins: [new TsconfigPathsPlugin()],
    },
    context: path.resolve(__dirname),
    // sourcemaps are broken right now
    // see: https://github.com/webpack-contrib/terser-webpack-plugin/issues/100
    devtool: false, // 'source-map',
    entry: {
      index: require.resolve('./src/index.ts'),
      server: require.resolve('./src/server.ts'),
    },
    output: {
      path: path.resolve(__dirname, 'lib'),
      filename: '[name].js',
      pathinfo: true,
      libraryTarget: 'commonjs2',
    },
    watchOptions: {
      ignored: /node_modules/,
      aggregateTimeout: 300,
    },
    target: 'node',
    externals: [
      nodeExternals({
        whitelist: [/^lodash/, /webpack\/hot\/poll/, /webpack\/hot\/signal/],
        modulesDir: path.resolve(__dirname, '..', 'node_modules'),
      }),
    ],
    plugins: [
      new StartServerPlugin({
        entryName: 'server',
      }),
      // options.hot && new MemoryFSPlugin(),
      new webpack.EnvironmentPlugin({
        NODE_ENV,
        APP_CLIENT_ID: 'err',
        WEB_CLIENT_ID: 'err',
        KEY_ID: 'err',
        REDIRECT_URI: 'err',
        SCOPE: 'err',
        TEAM_ID: 'err',
      }),
      new webpack.DefinePlugin({
        BUILD_TIMESTAMP: JSON.stringify(new Date().toLocaleString()),
        SF_TIMEZONE: JSON.stringify('America/Los_Angeles'),
      }),
    ].filter(Boolean),
    module: {
      rules: [
        {
          test: /\.g(?:raph)?ql$/,
          exclude: /node_modules/,
          loader: 'graphql-tag/loader',
        },
        {
          test: /\.(?:txt|p8)$/,
          loader: 'raw-loader',
        },
        {
          test: /\.(?:js|tsx?)/,
          exclude: /node_modules/,
          loader: 'babel-loader',
          options: {
            plugins: [
              'lodash',
              '@babel/plugin-proposal-class-properties',
              '@babel/plugin-proposal-object-rest-spread',
              '@babel/plugin-proposal-optional-catch-binding',
            ],
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: { node: '8.0' },
                  modules: false,
                },
              ],
            ],
          },
        },
        {
          test: /\.tsx?/,
          exclude: /node_modules/,
          loader: 'ts-loader',
          options: {
            onlyCompileBundledFiles: true,
            compilerOptions: {
              module: 'esnext',
              target: 'esnext',
              jsx: 'preserve',
            },
          },
        },
      ],
    },
  };
};
