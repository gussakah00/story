const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: "./src/scripts/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "main.bundle.js",
    clean: true,
    publicPath: "/story/",
  },
  module: {
    rules: [
      {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: "asset/resource",
        generator: {
          filename: "icons/[name][ext]",
        },
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./src/public",
          to: ".",
        },
        {
          from: "./src/styles/styles.css",
          to: "styles.css",
        },
        {
          from: "./app.webmanifest",
          to: "manifest.json",
        },
        {
          from: "./sw.js",
          to: ".",
        },
        {
          from: "./src/public/icons",
          to: "icons",
        },
      ],
    }),
  ],
};
