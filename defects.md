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