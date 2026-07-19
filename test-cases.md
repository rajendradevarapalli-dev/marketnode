# Test Cases — Bond Issuance System

## Legend
Priority: **High** = core financial correctness / critical business rule. **Medium** = important validation/edge case. **Low** = nice-to-have / observability.

---

## 1. SFTP Bond Creation

| ID | Title | Scenario | Expected Outcome | Priority |
|----|-------|----------|-------------------|----------|
| TC-01 | Valid file creates bonds | Upload a well-formed CSV with multiple valid bond rows | All bonds created with status PENDING, correct field values | High |
| TC-02 | Malformed row rejects entire file | Upload a CSV with a row missing fields and a row with an invalid faceValue | No bonds from the file are created (whole-file rejection, not partial) | High |
| TC-03 | Duplicate file name is not reprocessed | Upload the same file name twice | Second upload is ignored / not reprocessed | Medium |
| TC-04 | Invalid ISIN format rejected | Upload a bond row with ISIN that isn't 12 alphanumeric chars | Row/file rejected | Medium |
| TC-05 | bookOpenDate not before bookCloseDate rejected | Upload a bond where bookOpenDate >= bookCloseDate | Row/file rejected | Medium |
| TC-06 | maturityDate not after bookCloseDate rejected | Upload a bond where maturityDate <= bookCloseDate | Row/file rejected | Medium |
| TC-07 | totalSize exceeds maximum rejected | Upload a bond with totalSize > 100,000,000 | Row/file rejected | Low |
| TC-08 | No API visibility into file processing errors | Upload a malformed file, then attempt to query any endpoint for the failure reason | No endpoint currently exposes file processing status (observation, not a spec violation) | Low |

---

## 2. Bond Lifecycle & Business Date

| ID | Title | Scenario | Expected Outcome | Priority |
|----|-------|----------|-------------------|----------|
| TC-09 | Bond stays PENDING until advance-date evaluates it | Create a bond with bookOpenDate = today; do not call advance-date | Bond remains PENDING | High |
| TC-10 | Bond transitions to OPEN on/after bookOpenDate | Call advance-date until business date >= bookOpenDate | Bond status becomes OPEN | High |
| TC-11 | Bond transitions to CLOSED after bookCloseDate | Call advance-date until business date > bookCloseDate | Bond status becomes CLOSED, no new subscriptions accepted | High |
| TC-12 | Bond transitions to ALLOCATED after close | Advance date past bookCloseDate | Allocation runs, status becomes ALLOCATED | High |
| TC-13 | Bond transitions to MATURED on maturityDate | Advance date to maturityDate | Final coupon + principal paid, status becomes MATURED | High |
| TC-14 | System date persists and only advances via API | Call GET /api/system/date twice without advancing | Date unchanged between calls | Low |
| TC-15 | System reset restores today's date | Call POST /api/system/reset | business_date resets to actual calendar date | Low |

---

## 3. Subscription Rules

| ID | Title | Scenario | Expected Outcome | Priority |
|----|-------|----------|-------------------|----------|
| TC-16 | Subscribe successfully within open window | Subscribe while bond status is OPEN | Subscription created, status PENDING | High |
| TC-17 | Reject subscription after book close | Subscribe to a CLOSED bond | Rejected with clear error | High |
| TC-18 | Reject subscription before book open | Subscribe to a PENDING bond (before bookOpenDate reached) | Rejected with clear error | High |
| TC-19 | Reject duplicate subscription from same investor | Same investor subscribes twice to same bond | **Second subscription should be rejected** — currently FAILS, see DEF-001 | High |
| TC-20 | Reject non-positive quantity | Subscribe with quantity = 0 or negative | Rejected | Medium |
| TC-21 | Concurrent subscriptions don't over-allocate available size | Fire multiple simultaneous subscriptions exceeding remaining capacity | Available size tracked atomically, no double-accept | High |
| TC-22 | Missing X-User-Id header rejected | Subscribe without X-User-Id header | Rejected (400) | Medium |

---

## 4. Allocation

| ID | Title | Scenario | Expected Outcome | Priority |
|----|-------|----------|-------------------|----------|
| TC-23 | Full allocation when not oversubscribed | Total subscribed < totalSize | Each subscriber gets full requested quantity | High |
| TC-24 | Proportional allocation when oversubscribed | Total subscribed > totalSize | Each subscriber gets floor(qty/total × totalSize) — **currently FAILS, system rounds up, see DEF-002** | High |
| TC-25 | Sum of allocations never exceeds totalSize | Any oversubscription scenario | Sum of all allocated_quantity <= totalSize — **currently FAILS, see DEF-002** | High |
| TC-26 | Zero allocation marks subscriber REJECTED | Heavily oversubscribed scenario where a small subscriber rounds to 0 | Subscription status becomes REJECTED | Medium |

---

## 5. Coupon Payments

| ID | Title | Scenario | Expected Outcome | Priority |
|----|-------|----------|-------------------|----------|
| TC-27 | Daily coupon formula correctness | Single clean allocation, one business day advance | coupon = faceValue × couponRate × allocatedQuantity | High |
| TC-28 | No coupon paid on Saturday | Advance business date onto a Saturday | total_coupon_received should NOT increase — **currently FAILS, see DEF-003** | High |
| TC-29 | No coupon paid on Sunday | Advance business date onto a Sunday | total_coupon_received should NOT increase — **currently FAILS, see DEF-003** | High |
| TC-30 | Weekend coupon rolls into next business day | Advance through a weekend into Monday | Monday's credit should include the deferred weekend amount | Medium (blocked by DEF-003) |
| TC-31 | Coupon paid on maturity date if business day | Maturity date falls on a weekday | Final coupon paid same day as principal | High |
| TC-32 | Coupon stops after maturity | Advance date past maturity | No further coupon payments recorded | Medium |

---

## 6. Maturity

| ID | Title | Scenario | Expected Outcome | Priority |
|----|-------|----------|-------------------|----------|
| TC-33 | Principal repayment formula correctness | Bond reaches maturity | principal = faceValue × allocatedQuantity | High |
| TC-34 | Maturity on business day pays same day | maturityDate is Mon-Fri | Principal paid on maturityDate itself | High |
| TC-35 | Maturity on weekend shifts to next business day | maturityDate falls on Saturday/Sunday | Principal should pay on next business day — **currently FAILS, see DEF-004** | High |
| TC-36 | Bond status becomes MATURED only after principal paid | Check bond status immediately after maturity processing | Status = MATURED, available for query via /portfolio/maturities | High |

---

## 7. API Version Consistency (v1 vs v2)

| ID | Title | Scenario | Expected Outcome | Priority |
|----|-------|----------|-------------------|----------|
| TC-37 | v1 and v2 bond list return equivalent data | Call GET /api/v1/bonds and GET /api/v2/bonds | Same underlying data, different field casing/structure (snake_case flat vs camelCase nested) | Medium |
| TC-38 | v1 and v2 subscribe produce identical results | Subscribe via v1 then v2 (separate bonds) | Same business rules enforced on both versions | Medium |