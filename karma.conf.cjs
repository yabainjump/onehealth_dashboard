module.exports = function configureKarma(config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
    ],
    reporters: ['progress', 'kjhtml'],
    jasmineHtmlReporter: { suppressAll: true },
    browsers: ['Chrome'],
    // The unoptimized test graph includes all lazy routes and icon components.
    // Keep CI tolerant of slower shared Windows/Linux runners without retrying failed specs.
    browserDisconnectTimeout: 60_000,
    browserDisconnectTolerance: 2,
    browserNoActivityTimeout: 180_000,
    captureTimeout: 120_000,
    client: {
      clearContext: false,
    },
    restartOnFileChange: true,
  });
};
