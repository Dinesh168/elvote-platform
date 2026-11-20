module.exports = function (api) {
  api.cache(true);
  return {
    // unstable_transformImportMeta: zustand's ESM build uses import.meta, which the web bundle needs transformed.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};
