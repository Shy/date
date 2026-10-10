import { defineConfig } from "vite";

// Relative base works both at shy.github.io/date/ and on a custom domain root
export default defineConfig({
  base: "./",
  // In dev, /api goes to `npm run dev` in worker/ (wrangler, port 8787)
  server: { proxy: { "/api": "http://localhost:8787" } },
});
