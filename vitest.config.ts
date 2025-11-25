import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "forks", // Required because the tests use chdir
    testTimeout: 50000, // Required because the tests are building and pushing images
    hookTimeout: 75000,
  },
});
