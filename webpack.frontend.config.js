//@ts-check

'use strict';

const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

/**@type {import('webpack').Configuration}*/
const config = {
    target: 'web', // vscode extensions run in a Node.js-context 📖 -> https://webpack.js.org/configuration/node/
    entry: './src/webview/index.tsx', // the entry point of this extension, 📖 -> https://webpack.js.org/configuration/entry-context/
    output: {
        // the bundle is stored in the 'dist' folder (check package.json), 📖 -> https://webpack.js.org/configuration/output/
        path: path.resolve(__dirname, 'out'),
        filename: 'frontend.module.js',
        libraryTarget: 'window',
        devtoolModuleFilenameTemplate: '../[resource-path]',
    },
    devtool: false,
    externals: {
        vscode: 'vscode', // the vscode-module is created on-the-fly and must be excluded. Add other modules that cannot be webpack'ed, 📖 -> https://webpack.js.org/configuration/externals/
    },
    resolve: {
        // support reading TypeScript and JavaScript files, 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: ['.tsx', '.ts', '.js', '.jsx', '.css'],
    alias: {
      react: path.resolve('./node_modules/react'),
    },
    },
    module: {
        rules: [
                  {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              sourceMap: true,
            },
          },
        ],
      },
            {
                test: /(\.tsx|\.ts)\b/,
                exclude: /node_modules/,
                use: [
                    {
                        loader: 'ts-loader',
                    },
                ],
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'src/webview/index.html', to: 'index.html' },
            ],
        }),
    ],
};
module.exports = config;