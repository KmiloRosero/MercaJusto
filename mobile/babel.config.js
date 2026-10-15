module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo ya incluye el plugin de react-native-worklets (Reanimated 4).
    presets: ["babel-preset-expo"],
  };
};
