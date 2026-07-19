module.exports = {
  default: {
    paths: ['tests/features/**/*.feature'],
    require: ['tests/step-definitions/**/*.js', 'tests/support/**/*.js'],
    format: ['progress', 'json:reports/cucumber-report.json', 'html:reports/cucumber-report.html'],
    publishQuiet: true
  }
};
