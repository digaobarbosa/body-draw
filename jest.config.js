module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'scripts/**/*.js',
    '!scripts/**/*.min.js'
  ],
  coverageDirectory: 'coverage',
  verbose: true
};