import { defineConfig } from "vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import svgr from "vite-plugin-svgr"

export default defineConfig({
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteTsConfigPaths({ projects: ["./tsconfig.json"] }),
    tailwindcss(),
    viteReact(),
    svgr(),
  ],
})
