const path = require("path");
const common = require("./webpack.common.js");
const { merge } = require("webpack-merge");

module.exports = merge(common, {
  mode: "production",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.bundle.js",
    publicPath: "/story/",
    clean: true,
  },
  optimization: {
    minimize: true,
    splitChunks: false,
    runtimeChunk: false,
  },
});
