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
    browserDisconnectTimeout: 15_000,
    browserDisconnectTolerance: 2,
    browserNoActivityTimeout: 120_000,
    captureTimeout: 120_000,
    client: {
      clearContext: false,
    },
    restartOnFileChange: true,
  });
};
