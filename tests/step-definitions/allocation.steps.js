const { Given, When, Then } = require('@cucumber/cucumber');
const assert = require('assert');
const { getBusinessDate, advanceDate, uploadBondFile, subscribe, getBonds, getBond, getPortfolio } = require('../support/apiHelper');
const { addDays } = require('../utils/dateHelper');

Given('the current business date is known', async function () {
  this.today = await getBusinessDate(this.apiContext);
});

Given('a bond is created with total size {int} opening today and closing in {int} day', async function (totalSize, closeDays) {
  const isin = 'TST' + Date.now().toString().slice(-9);
  const bookOpen = this.today;
  const bookClose = addDays(this.today, closeDays);
  const maturity = addDays(this.today, closeDays + 10);
  const csv = `isin,issuerName,bondName,currency,faceValue,couponRate,maturityDate,totalSize,bookOpenDate,bookCloseDate\n${isin},Auto Test Issuer,Auto Test Bond,MYR,1000.00,0.0005,${maturity},${totalSize},${bookOpen},${bookClose}\n`;
  const fileName = `BONDS_AUTOTEST_${Date.now()}.csv`;
  await uploadBondFile(this.apiContext, csv, fileName);

  const bonds = await getBonds(this.apiContext);
  const created = bonds.find(b => b.isin === isin);
  assert.ok(created, 'Bond was not created after SFTP upload');
  this.lastBondId = created.id;
  this.bookCloseDays = closeDays;
});

Given('the bond book window is open', async function () {
  await advanceDate(this.apiContext); // move date forward so bond opens
  const bond = await getBond(this.apiContext, this.lastBondId);
  assert.strictEqual(bond.status, 'OPEN', `Expected bond OPEN but got ${bond.status}`);
});

When('{string} subscribes for {int} units', async function (userId, quantity) {
  const res = await subscribe(this.apiContext, this.lastBondId, userId, quantity);
  assert.strictEqual(res.status(), 200, `Subscribe failed for ${userId}: ${await res.text()}`);
});

When('the book closes and allocation runs', async function () {
  await advanceDate(this.apiContext);
  const bond = await getBond(this.apiContext, this.lastBondId);
  assert.strictEqual(bond.status, 'ALLOCATED', `Expected ALLOCATED but got ${bond.status}`);
});

Then('{string} should be allocated exactly {int} units', async function (userId, expectedQty) {
  const portfolio = await getPortfolio(this.apiContext, userId);
  const sub = portfolio.find(p => p.bond_id === this.lastBondId);
  assert.ok(sub, 'Subscription not found in portfolio');
  assert.strictEqual(sub.allocated_quantity, expectedQty);
  this.lastSubscription = sub;
});

Then('the subscription status should be {string}', function (expectedStatus) {
  assert.strictEqual(this.lastSubscription.status, expectedStatus);
});

Then('the sum of all allocated quantities should not exceed {int}', async function (totalSize) {
  const users = ['INV-001', 'INV-002', 'INV-003'];
  let sum = 0;
  for (const u of users) {
    const portfolio = await getPortfolio(this.apiContext, u);
    const sub = portfolio.find(p => p.bond_id === this.lastBondId);
    if (sub) sum += sub.allocated_quantity;
  }
  assert.ok(sum <= totalSize, `Sum of allocations (${sum}) exceeds totalSize (${totalSize}) — see DEF-002`);
});
