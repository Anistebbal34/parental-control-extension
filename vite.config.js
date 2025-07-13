import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "src/background.js"),
        "youtube-content": resolve(__dirname, "src/youtube-content.js"),
        "nsfw-content": resolve(__dirname, "src/nsfw-content.js"),
      },
      output: {
        entryFileNames: "[name].js",
      },
    },
  },
  publicDir: "public",
});
