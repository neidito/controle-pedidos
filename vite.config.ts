import path from "path";
import { writeFileSync } from "fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

function versionPlugin(): Plugin {
  const buildId = Date.now().toString();
  return {
    name: "version-plugin",
    config() {
      return {
        define: {
          "import.meta.env.VITE_BUILD_ID": JSON.stringify(buildId),
        },
      };
    },
    buildStart() {
      writeFileSync(
        path.resolve(__dirname, "public/version.json"),
        JSON.stringify({ buildId })
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), versionPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
