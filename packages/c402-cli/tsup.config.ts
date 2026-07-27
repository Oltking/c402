import { defineConfig } from "tsup";

// Builds the publishable tarball: ESM JS + .d.ts into dist/. Dependencies are externalized
// automatically. Local development still runs src/*.ts directly (no build step) - publishConfig
// swaps main/exports/bin to dist/ only in the published package.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  target: "node22",
  dts: true,
  clean: true,
  sourcemap: true,
});
