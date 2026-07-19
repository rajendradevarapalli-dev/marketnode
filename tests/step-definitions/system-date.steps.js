const { When, Then } = require('@cucumber/cucumber');
const assert = require('assert');

When('I request the current business date', async function () {
  this.response = await this.apiContext.get('/api/system/date');
  this.responseBody = await this.response.json();
});

Then('the response status should be {int}', function (expectedStatus) {
  assert.strictEqual(this.response.status(), expectedStatus);
});

Then('the response should contain a business_date field', function () {
  assert.ok(this.responseBody.business_date, 'business_date field missing');
});
