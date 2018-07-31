module.exports = {
  context: 'C:\\projects\\clndr',
  mode: 'production',
  entry: './src/clndr.js',
  node: {
    __dirname: false,
    __filename: false,
  },
  output: {
    path: __dirname + '/dist',
    filename: 'clndr.min.js',
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
            plugins: [
              [
                '@babel/plugin-proposal-object-rest-spread',
                {
                  useBuiltIns: true,
                },
              ],
            ],
          },
        },
      },
    ],
  },
  optimization: {
    minimize: true,
  },
};
