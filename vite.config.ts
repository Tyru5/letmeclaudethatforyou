import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));
  return {
    resolve: { tsconfigPaths: true },
    server: { allowedHosts: [".trycloudflare.com"] },
    optimizeDeps: { exclude: ["@resvg/resvg-js", "@vercel/sandbox"] },
    ssr: { external: ["@resvg/resvg-js", "@vercel/sandbox"] },
    plugins: [tanstackStart(), nitro(), viteReact(), tailwindcss()],
  };
});
