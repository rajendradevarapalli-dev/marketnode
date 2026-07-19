# Bond Issuance System — QA Automation Assessment

## Context

You are joining a capital markets engineering team as a **QA Automation Engineer**. The Bond Issuance System (BIS) has been deployed and is used in production. Your job is to build a comprehensive automated test suite that gives the team confidence in the system's correctness.

The system manages bond issuances, investor subscriptions, allocations, coupon payments, and maturity events. It accepts bond data via SFTP file upload, exposes two API versions simultaneously, and provides a web interface for investors.

**Authentication is not in scope.** The application provides predefined mock users (INV-001 through INV-005) with a user switcher. API calls identify the user via the `X-User-Id` header.

`PRODUCT.md` is the source of truth for expected system behavior.

**Sample fixtures are examples only.** The CSV files under `fixtures/` illustrate the expected file format and are not guaranteed to be usable as-is. The business date starts at today's calendar date.

**API Documentation:** The backend provides interactive API documentation via Swagger UI at `http://localhost:8080/swagger-ui.html`. Use this to explore available endpoints, request/response schemas, and test API calls directly.

---

## Getting Started

The application images are hosted in a private container registry. Authenticate before starting the stack:

```bash
docker login -u candidate -p ArnUqRw8VSj4xPnxLYDdjxcwVUAM4zHi9abxUJSbS3BjE05QQkVoJQQJ99CFACqBBLyEqg7NAAABAZCRAJpR interviewmarketnode.azurecr.io
```

Then bring up the stack from the `candidate-project` directory:

```bash
docker compose up -d
```

Verify the backend is reachable at `http://localhost:8080/swagger-ui.html` and the frontend at `http://localhost:5173`.

---

## Your Tasks

### 1. Build an Automated Test Suite

Create a test suite that validates the system behaves according to its product specification. The suite should demonstrate your ability to think critically about what could go wrong in a financial system and verify that the implementation matches the documented behavior.

Consider all layers of the system and the interactions between them.

### 2. Document Your Test Approach

Create `test-plan.md` explaining your testing strategy, what you chose to cover, how you structured the suite, and any trade-offs you made.

### 3. Write Test Cases

Create `test-cases.md` listing the individual test cases you intend to cover. For each test case include: a short title, the scenario being tested, the expected outcome, and the priority level (high / medium / low). These should map to your automated tests and reflect your thinking about what matters most in a financial system.

### 4. Document Findings

Create `defects.md` recording anything you discover where the system's actual behavior differs from the documented specification. Include sufficient detail for a developer to reproduce each finding.

### 5. Make It Runnable

Provide a single command from the repository root:

```bash
./run-tests.sh
```

The script assumes the application stack (`docker compose up -d`) is already running and in a clean state.

The script **must**:
1. Execute the full test suite
2. Generate a test report at the end

### 6. Maintain AI Usage Log

Append every AI interaction to `ai-prompt.log`:

```text
---
timestamp: 2026-05-05T10:30:00Z
model: <model name>
prompt: |
  <full prompt text>
---
```

---

## Constraints

- **Submission:** Submit via email as a `.zip` archive, or share a GitHub repository link
- **Deadline:** 7 days (168 hours) from access granted
- **Docker:** Do not add third-party Docker images beyond what is already in docker-compose
- **Expected effort:** Minimum 2 hours, maximum 6 hours

---

## Deliverables

| File | Purpose |
|------|---------|
| `run-tests.sh` | Single entry point to run the full suite |
| `test-plan.md` | Test strategy and coverage documentation |
| `test-cases.md` | Individual test cases with scenarios, expected outcomes, and priorities |
| `defects.md` | Findings with reproduction evidence |
| `README.md` | Setup steps and architecture decisions |
| `ai-prompt.log` | AI interaction log |

---

## Evaluation

Your submission will be evaluated on:

- **Automation design** — structure, maintainability, and reliability of the test suite
- **Coverage breadth** — how well the test cases reflect critical paths and edge cases in a financial system
- **Test case quality** — clarity of scenarios, expected outcomes, and prioritization in `test-cases.md`
- **Defect evidence** — reproduction detail and clarity of findings
- **AI usage** — how effectively and transparently AI tooling was applied, as recorded in `ai-prompt.log`

AI usage is encouraged. Use whatever tools help you work effectively.
