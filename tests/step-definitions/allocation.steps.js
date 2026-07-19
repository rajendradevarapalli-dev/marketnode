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

Then('a second subscription attempt by {string} for {int} units should be rejected', async function (userId, quantity) {
  const res = await subscribe(this.apiContext, this.lastBondId, userId, quantity);
  assert.notStrictEqual(res.status(), 200, `Expected duplicate subscription to be rejected, but got status ${res.status()} — see DEF-001`);
});

Then('no coupon amount should be added when the business date is a weekend day', async function () {
  const { isWeekend } = require('../utils/dateHelper');
  let weekendHit = false;
  let violation = null;

  for (let i = 0; i < 6 && !weekendHit; i++) {
    const before = await getPortfolio(this.apiContext, 'INV-011');
    const beforeCoupon = (before.find(p => p.bond_id === this.lastBondId) || {}).total_coupon_received || 0;

    await advanceDate(this.apiContext);
    const currentDate = await getBusinessDate(this.apiContext);

    const after = await getPortfolio(this.apiContext, 'INV-011');
    const afterCoupon = (after.find(p => p.bond_id === this.lastBondId) || {}).total_coupon_received || 0;

    if (isWeekend(currentDate)) {
      weekendHit = true;
      if (afterCoupon > beforeCoupon) {
        violation = `Coupon increased from ${beforeCoupon} to ${afterCoupon} on weekend date ${currentDate}`;
      }
    }
  }

  assert.ok(weekendHit, 'Did not encounter a weekend day within 6 advances — test setup issue');
  assert.strictEqual(violation, null, violation + ' — see DEF-003');
});

Given('a bond is created maturing on the next Saturday with total size {int}', async function (totalSize) {
  const { isWeekend, addDays } = require('../utils/dateHelper');
  const isin = 'TSW' + Date.now().toString().slice(-9);
  const bookOpen = this.today;
  const bookClose = addDays(this.today, 1);
  let maturity = addDays(this.today, 3);
  while (!isWeekend(maturity)) {
    maturity = addDays(maturity, 1);
  }
  const csv = `isin,issuerName,bondName,currency,faceValue,couponRate,maturityDate,totalSize,bookOpenDate,bookCloseDate\n${isin},Weekend Maturity Auto,Weekend Maturity Auto Bond,MYR,1000.00,0.0005,${maturity},${totalSize},${bookOpen},${bookClose}\n`;
  const fileName = `BONDS_AUTOTEST_WKND_${Date.now()}.csv`;
  const created = await uploadBondFile(this.apiContext, csv, fileName, isin);
  assert.ok(created, 'Bond was not created after SFTP upload (timed out polling)');
  this.lastBondId = created.id;
  this.maturityDate = maturity;
});

Then('the bond should advance to maturity date', async function () {
  const { isWeekend } = require('../utils/dateHelper');
  for (let i = 0; i < 8; i++) {
    const currentDate = await getBusinessDate(this.apiContext);
    if (currentDate >= this.maturityDate) break;
    await advanceDate(this.apiContext);
  }
});

Then('principal should not be paid while the maturity date is still a weekend day', async function () {
  const { isWeekend } = require('../utils/dateHelper');
  const currentDate = await getBusinessDate(this.apiContext);
  const bond = await getBond(this.apiContext, this.lastBondId);

  if (isWeekend(currentDate) && currentDate === this.maturityDate) {
    assert.notStrictEqual(bond.status, 'MATURED', `Bond matured on weekend date ${currentDate} — see DEF-004`);
  }
});
