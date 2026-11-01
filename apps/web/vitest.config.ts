import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "../../vitest.config";

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      // Large module graph (Sidebar, ChatMarkdown) flakes when Vitest transforms many files in parallel.
      fileParallelism: false,
      maxWorkers: 1,
    },
  }),
);
