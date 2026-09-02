module.exports = {
  clearMocks: true,
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/test/setupTests.ts'],
  testEnvironment: 'jsdom',
  testMatch: ['**/*.test.[jt]s?(x)'],
  transform: {
    '^.+\\.[jt]sx?$': '<rootDir>/src/test/jestTransformer.cjs',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|sass|scss)$': '<rootDir>/src/test/styleMock.cjs',
    '\\.(gif|png|jpe?g|svg|webp)$': '<rootDir>/src/test/fileMock.cjs',
  },
};
