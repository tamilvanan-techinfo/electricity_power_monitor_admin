// vite.main.config.ts
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        "ws",
        "bufferutil",
        "utf-8-validate",
        "sqlite3",
        "electron-squirrel-startup",
      ],
    },
  },
});