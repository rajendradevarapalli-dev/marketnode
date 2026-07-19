## DEF-001: Duplicate subscriptions allowed for the same investor on the same bond

**Severity:** High
**Spec reference:** PRODUCT.md Section 6 — "Each investor may only subscribe once per bond."

**Steps to reproduce:**
1. Upload a bond via SFTP with an open book window (e.g. bookOpenDate = today).
2. Advance business date so the bond transitions to OPEN.
3. Subscribe as INV-001: `POST /api/v1/bonds/{id}/subscribe` with `{"quantity": 40000}` → succeeds (subscription id created).
4. Subscribe as INV-001 again on the same bond with a different quantity: `{"quantity": 10000}` → **expected: rejected (400/409)**. **Actual: succeeds**, creating a second subscription record for the same investor on the same bond.

**Evidence:**
`GET /api/v1/portfolio` (header `X-User-Id: INV-001`) shows multiple active PENDING subscriptions for the same bond_id (e.g. subscription_id 1 and 5, both bond_id 1).

**Impact:** Violates the one-subscription-per-investor-per-bond rule. Could distort total subscribed quantity used in proportional allocation calculations (Section 7), since one investor's demand is counted multiple times.



## DEF-002: Proportional allocation uses ceiling instead of floor, causing over-allocation beyond totalSize

**Severity:** High
**Spec reference:** PRODUCT.md Section 7 — "Each subscriber gets: `floor(their_quantity / total_subscribed × totalSize)`"

**Steps to reproduce:**
1. Bond with `totalSize = 100000`.
2. Total subscribed quantity across all investors = 170,000 (oversubscribed).
3. Advance business date past `bookCloseDate` to trigger allocation.
4. Check allocated quantities via `GET /api/v1/portfolio` for each investor.

**Expected (per floor formula):**
| Subscribed Qty | Calculation | Expected (floor) |
|---|---|---|
| 40,000 | 40000/170000×100000 = 23529.41 | 23,529 |
| 10,000 | 10000/170000×100000 = 5882.35 | 5,882 |
| 30,000 | 30000/170000×100000 = 17647.06 | 17,647 |
| 50,000 | 50000/170000×100000 = 29411.76 | 29,411 |

**Actual (observed):**
| Subscribed Qty | Actual Allocated |
|---|---|
| 40,000 | 23,530 |
| 10,000 | 5,883 |
| 30,000 | 17,648 |
| 50,000 | 29,412 |

Every allocated value is exactly 1 unit higher than the floor formula specifies — indicating the system rounds up (ceiling) rather than truncating (floor).

**Impact — critical:** Sum of actual allocations = 23,530 + 23,530 + 5,883 + 17,648 + 29,412 = **100,003**, which **exceeds** the bond's `totalSize` of 100,000 by 3 units. This means the system can allocate/issue more bond units than actually exist, breaking the core sizing constraint of the product.

**Related observation:** Subscriptions belonging to the same investor (from DEF-001's duplicate-subscription scenario) all show an identical `total_coupon_received` value equal to the sum of what each individual subscription should earn — suggesting coupon totals may be aggregated at investor level and then duplicated across each of that investor's subscription records, rather than computed independently per subscription. Needs further isolated testing (single investor, single subscription) to confirm whether this is a separate defect or a side effect of DEF-001.




## DEF-003: Coupon payments are not skipped on weekends

**Severity:** High
**Spec reference:** PRODUCT.md Section 8 — "No coupon is paid on weekends (Saturday, Sunday)."

**Steps to reproduce:**
1. Bond (id=3) with `faceValue=1000`, `couponRate=0.0005`, single clean subscription (INV-004, no duplicates) with `allocated_quantity=20000`.
2. Advance business date day by day via repeated `POST /api/system/advance-date` calls, checking `GET /api/v1/portfolio` (header `X-User-Id: INV-004`) after each advance.
3. Observe `total_coupon_received` after each advance.

**Expected daily coupon (per formula `faceValue × couponRate × allocatedQuantity`):** 1000 × 0.0005 × 20000 = 10,000/day, paid only on business days (Mon–Fri).

**Observed sequence:**
| Business Date | Day of Week | total_coupon_received | Expected behavior |
|---|---|---|---|
| 2026-07-24 | Thursday | 10,000 | Correct — business day |
| 2026-07-25 | Saturday | 20,000 (+10,000) | **Incorrect — should skip, no increase** |
| 2026-07-26 | Sunday | 30,000 (+10,000) | **Incorrect — should skip, no increase** |
| 2026-07-27 | Monday | 40,000 (+10,000) | Correct — business day (though should also include the rolled-over Sat/Sun amount per spec, if that rollover logic were implemented) |

**Impact — critical:** The system pays a full day's coupon on every `advance-date` call regardless of day-of-week, with no weekend check applied at all. This directly overpays investors — in this isolated 4-day window alone, 20,000 was paid in excess (2 weekend days × 10,000) that should not have been paid at all under the documented rules. Over a full bond lifecycle, this compounds significantly and materially misstates amounts owed to investors.

**Note:** This also means the "rollover to next business day" behavior (confirmed understanding: weekend interest should be skipped and added to the next working day's credit) is not implemented — weekend days are being paid directly rather than skipped and deferred.




## DEF-004: Maturity processed on weekend date instead of shifting to next business day

**Severity:** High
**Spec reference:** PRODUCT.md Section 9 — "Maturity date must be a business day. If it falls on weekend, payment is on next business day."

**Steps to reproduce:**
1. Create a bond with `maturityDate = 2026-08-01` (a Saturday), `bookOpenDate = 2026-07-30`, `bookCloseDate = 2026-07-31`.
2. Subscribe a single investor (INV-002, quantity 25000, full allocation, no oversubscription — clean isolated test).
3. Advance business date via repeated `POST /api/system/advance-date` calls up to and including `2026-08-01`.
4. Check `GET /api/v1/bonds/{id}` and `GET /api/v1/portfolio/maturities`.

**Expected:** Since `2026-08-01` is a Saturday, maturity processing (final coupon + principal repayment + status → MATURED) should be deferred to the next business day, `2026-08-03` (Monday).

**Actual:**
- Bond status flipped directly to `MATURED` as soon as business date reached `2026-08-01` (the Saturday itself).
- `GET /api/v1/portfolio/coupons` shows a coupon payment dated `2026-08-01` (Saturday), amount 12,500.
- `GET /api/v1/portfolio/maturities` shows: `{"bond_id":7,"bond_name":"Weekend Maturity Bond","maturity_date":"2026-08-01","principal_amount":2.5E7,"status":"PAID"}` — principal paid on the Saturday itself, not shifted to Monday `2026-08-03`.

**Impact:** Directly violates the documented business-day rule for maturity. Combined with DEF-003, this confirms the system has no weekend/business-day awareness anywhere in its date-advancement or payment-processing logic — it appears to treat every calendar day as a valid processing day regardless of type. This is likely the same root cause underlying both DEF-003 and DEF-004.