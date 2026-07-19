# Bond Issuance QA — Automated Test Suite

Automated test suite for the Bond Issuance System (BIS), covering the bond lifecycle: SFTP-driven bond creation, subscriptions, proportional allocation, coupon payments, and maturity/principal repayment.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+

## Setup

1. **Authenticate to the private container registry:**
(See `TASKS.md` for the actual credential.)

2. **Start the application stack:**
This brings up Postgres, the SFTP server, the backend (Swagger UI at `http://localhost:8080/swagger-ui.html`), and the frontend (`http://localhost:5173`).

   > Note: if backend/frontend containers exit immediately with an "exec format error" (architecture mismatch), run `docker run --rm --privileged multiarch/qemu-user-static --reset -p yes` before `docker compose up -d`.

3. **Install test dependencies:**
4. **Run the test suite:**
Checks the backend is reachable, runs the full Cucumber suite, generates reports at `reports/cucumber-report.html` and `reports/cucumber-report.json`.

## Architecture

- **Framework:** Playwright's API request context + Cucumber (Gherkin/BDD).
- **Testing layer:** API-level testing chosen over UI automation, since the system's core risk lives in financial logic (allocation, coupon accrual, maturity payout), not UI rendering.
- **Test data isolation:** Each scenario creates its own bond via a fresh SFTP file drop (unique ISIN per run).
- **Business-date control:** Lifecycle is driven entirely by `POST /api/system/advance-date`, so tests are deterministic regardless of when they're run.
- **Folder structure:**
## Test Results Summary

4 scenarios are expected to fail — they encode documented correct behavior and demonstrate 4 confirmed defects (see `defects.md`):
- DEF-001 — duplicate subscriptions allowed
- DEF-002 — allocation over-allo`   cates beyond total size
- DEF-003 — coupon paid on weekends
- DEF-004 — maturity processed on weekend date

## Further Documentation

- `test-plan.md`, `test-cases.md`, `defects.md`, `ai-prompt.log`