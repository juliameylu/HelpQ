export default {
  testEnvironment: "node",
  clearMocks: true,
  transform: {},
  collectCoverageFrom: ["src/services/scheduleSync.js"],
  coverageThreshold: {
    global: {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    }
  }
};
