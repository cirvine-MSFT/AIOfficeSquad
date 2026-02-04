import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@office/shared": path.resolve(__dirname, "../../shared/src/index.ts")
    }
  },
  server: {
    port: 3000
  }
});
