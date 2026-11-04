module.exports = config => config.set({
 frameworks: ['jasmine', '@angular-devkit/build-angular'],
 plugins: [require('karma-jasmine'),require('karma-chrome-launcher'),require('@angular-devkit/build-angular/plugins/karma')],
 reporters: ['progress'],
 browsers: ['ChromeHeadlessProject'],
 customLaunchers: { ChromeHeadlessProject: { base: 'ChromeHeadless', flags: ['--disable-gpu', '--disable-software-rasterizer'] } },
 singleRun: true,
 browserNoActivityTimeout: 30000
});
