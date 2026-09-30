import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

export default defineConfig({
  resolve: {
    // Аналог "paths": {"@/*": ["./src/*"]} из tsconfig.json
    alias: { "@": srcDir },
  },
  esbuild: {
    // JSX через react/jsx-runtime (в tsconfig стоит "jsx": "preserve" от Next)
    jsx: "automatic",
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "app/**/*.test.{ts,tsx}"],
  },
});