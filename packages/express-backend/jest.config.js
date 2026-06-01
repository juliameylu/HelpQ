export default {
  testEnvironment: "node",
  clearMocks: true,
  transform: {},
  collectCoverageFrom: [
    "src/utils/**/*.js",
    "src/routes/guest.js",
    "src/routes/api.js",
    "src/middleware/auth.js"
  ],
  coveragePathIgnorePatterns: [
    "/node_modules/",
    "/src/__tests__/"
  ],
  coverageReporters: ["text", "text-summary", "lcov"]
};
