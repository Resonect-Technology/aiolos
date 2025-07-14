import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    port: 3002,
    host: true,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: "./index.html",
      },
    },
  },
});
