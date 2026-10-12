module.exports = {
  root: true,
  extends: '@react-native',
  // Byte-identical copies of the website's minified bundles (restored by
  // scripts/web-twin/vendor.mjs, git-ignored): never ours to lint.
  ignorePatterns: ['scripts/web-twin/vendor/'],
};
