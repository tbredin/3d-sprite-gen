import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function gitBranch(): string {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      encoding: "utf8",
    }).trim();
    // Detached HEAD → "HEAD"; fall back to short SHA.
    if (!branch || branch === "HEAD") {
      return execSync("git rev-parse --short HEAD", {
        encoding: "utf8",
      }).trim();
    }
    return branch;
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_BRANCH__: JSON.stringify(gitBranch()),
  },
  server: {
    host: "127.0.0.1",
    port: 5183,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8788",
        changeOrigin: true,
        timeout: 900_000,
        proxyTimeout: 900_000,
      },
    },
  },
});
