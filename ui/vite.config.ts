import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiHost = env.API_HOST ?? "http://localhost:8080";

  return {
    plugins: [react()],
    publicDir: "static",
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiHost,
          changeOrigin: true,
        },
        "/media": {
          target: apiHost,
          changeOrigin: true,
        },
      },
    },
  };
});
