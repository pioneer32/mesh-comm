const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');

module.exports = (webpackConfigEnv, argv) => {
  return {
    mode: 'development',
    devtool: 'eval-source-map',
    entry: {
      'mesh-comm-root-config': path.resolve(__dirname, 'src/mesh-comm-root-config.ts'),
      'mesh-comm-react-mfe': path.resolve(__dirname, 'src/mesh-comm-react-mfe.tsx'),
      'mesh-comm-vanilla-mfe': path.resolve(__dirname, 'src/mesh-comm-vanilla-mfe.ts'),
      'mesh-comm-vue-mfe': path.resolve(__dirname, 'src/mesh-comm-vue-mfe.ts'),
    },
    output: {
      library: { type: 'system' },
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.vue'],
      extensionAlias: {
        '.js': ['.js', '.ts'],
      },
    },
    externals: ['react', 'react-dom', 'jquery'],
    module: {
      rules: [
        {
          test: /\.(js|ts)x?$/,
          exclude: /node_modules/,
          use: {
            loader: require.resolve('babel-loader', { paths: [__dirname] }),
          },
        },
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
      ],
    },
    plugins: [
      new ForkTsCheckerWebpackPlugin({
        typescript: {
          mode: 'write-references',
        },
      }),
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        inject: 'body',
        scriptLoading: 'blocking',
        template: 'src/index.html.ejs',
        templateParameters: {},
        chunks: ['mesh-comm-root-config'],
        cache: false,
      }),
    ],
  };
};
