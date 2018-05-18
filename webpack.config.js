module.exports = {
  mode: 'production',
  entry: './src/clndr.js',
  output: {
    path: __dirname + '/dist',
    filename: 'clndr.min.js'
  },
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
    minimize: true
  }
};
