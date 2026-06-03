import { defineConfig } from "vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import svgr from "vite-plugin-svgr"

const API_PROXY = {
  target: "http://localhost:4000",
  changeOrigin: false,
};

export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    viteReact(),
    svgr(),
  ],
  server: {
    proxy: {
      "/graphql": API_PROXY,
      "/auth": API_PROXY,
      "/upload": API_PROXY,
      "/download": API_PROXY,
      "/oauth": API_PROXY,
      "/healthz": API_PROXY,
    },
  },
})
