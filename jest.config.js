/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    roots: ["<rootDir>/tests"],
    moduleFileExtensions: ["ts", "js", "json"],
    transform: {
        "^.+\\.ts$": "ts-jest",
    },
    clearMocks: true,
    collectCoverage: true,
    collectCoverageFrom: ["src/**/*.{ts,js}", "!src/index.ts"],
    coverageDirectory: "coverage",
};
