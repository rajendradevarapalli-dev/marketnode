# Test Plan — Bond Issuance System (BIS)

## 1. Objective

Validate that the Bond Issuance System behaves according to `PRODUCT.md`, with a focus on the correctness of financial calculations (allocation, coupon, maturity) since these carry the highest business risk in a fintech system.

## 2. Scope

**In scope:**
- SFTP bond creation and file validation
- Bond lifecycle state transitions, driven by the business-date control API
- Subscription rules (book window, duplicate prevention, quantity validation)
- Proportional allocation logic and rounding behavior
- Daily coupon calculation, including business-day handling
- Maturity processing and principal repayment
- Consistency between API v1 (snake_case) and v2 (camelCase)

**Out of scope / not tested in depth:**
- Authentication (explicitly out of scope per PRODUCT.md — mock users only)
- Frontend UI automation (backend/API is the primary surface for financial logic; UI covered only lightly, e.g. user switcher sanity check)
- Load/performance testing beyond basic concurrency check on subscription capacity
- Full combinatorial coverage of every SFTP validation rule (a representative subset was chosen — see Section 4)

## 3. Approach

1. **Manual exploration first.** Before writing any automated test, the system was explored manually via Swagger/curl to build an accurate mental model of actual behavior, since API documentation (Swagger schema) did not always show full request/response detail. This surfaced 4 confirmed defects before a single automated test was written (see `defects.md`).
2. **Isolated test data per scenario.** Each test scenario uses its own bond and, where possible, investors not reused across scenarios, to avoid state bleeding between test cases (an important lesson learned after an early duplicate-subscription bug polluted allocation numbers in initial exploration).
3. **Business-date-driven testing.** Since the system's lifecycle is entirely driven by explicit `advance-date` calls rather than real time, tests control time precisely by calling this endpoint the required number of times and asserting state after each call — this makes tests deterministic and repeatable regardless of when they're actually run.
4. **API-level testing as the primary layer.** Given the system's core value is in its financial logic (allocation math, coupon accrual, maturity payout), API-level tests give the fastest, most precise, most maintainable coverage of that logic — compared to driving the same scenarios through the UI.
5. **Both API versions checked** for critical flows (subscribe, list bonds, portfolio) to confirm v1/v2 parity, since PRODUCT.md states both are used in production simultaneously.

## 4. Test Data Strategy

- Fresh bonds created per test scenario (via SFTP upload) with dates anchored to the *current* business date at test-run time, rather than hardcoded dates — since business date starts at the real calendar date on system startup and the provided fixture files' hardcoded 2026 dates would otherwise fall in the past.
- A mix of clean single-investor scenarios (to isolate specific behaviors like coupon math) and multi-investor oversubscription scenarios (to test allocation math) were used deliberately, rather than reusing one bond for everything.

## 5. Priorities

High-priority coverage was concentrated on:
- Allocation math and the totalSize ceiling constraint
- Coupon calculation and business-day handling
- Maturity payout and business-day handling
- Subscription window enforcement and duplicate prevention

These represent the highest financial risk if incorrect (over-issuance, incorrect investor payouts).

## 6. Defects Found

Manual exploration and automated testing surfaced 4 high-severity defects, detailed in `defects.md`:
- **DEF-001** — Duplicate subscriptions allowed for the same investor on the same bond
- **DEF-002** — Proportional allocation rounds up instead of down (floor), causing total allocation to exceed totalSize
- **DEF-003** — Coupon payments are made on weekends (no business-day check)
- **DEF-004** — Maturity processing occurs on the maturity date even when it falls on a weekend, instead of shifting to the next business day

DEF-003 and DEF-004 likely share a root cause: the system does not appear to check day-of-week anywhere in its date-advancement/payment logic.

## 7. Trade-offs and Limitations

- Given the assessment's suggested effort window (2–6 hours), automated coverage focuses on the high-priority scenarios identified during manual exploration rather than attempting exhaustive coverage of every SFTP validation rule.
- Concurrency testing (atomic handling of simultaneous subscriptions near capacity) is included as a single representative test rather than a full race-condition test suite, given time constraints.
- No load/performance testing was performed; this is a functional-correctness-focused suite.
- Manual exploration used real dates anchored to the Codespace's actual business date at the time; automated tests fetch the current business date at run time rather than hardcoding dates, so the suite remains valid regardless of when it's executed.