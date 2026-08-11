// forge.config.js
const { VitePlugin } = require('@electron-forge/plugin-vite');
const { AutoUnpackNativesPlugin } = require('@electron-forge/plugin-auto-unpack-natives');

module.exports = {
  packagerConfig: {
    asar: true,
    asarUnpack: ['**/node_modules/sqlite3/**'],
  },
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.js', // adjust if your main entry is different
          config: 'vite.main.config.mjs',
        },
        // preload if you use it:
        {
          entry: 'src/preload.js', // adjust path as needed
          config: 'vite.preload.config.mjs',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mjs',
        },
      ],
    }),
    new AutoUnpackNativesPlugin({}),
  ],
  makers: [
    { name: '@electron-forge/maker-squirrel', config: {} },
    { name: '@electron-forge/maker-zip', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb', config: {} },
    { name: '@electron-forge/maker-rpm', config: {} },
  ],
};