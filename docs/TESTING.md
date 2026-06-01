# HelpQ — Testing Documentation

## Rubric Option Selected

**Option: Jest integration tests on the Express route layer with direct unit tests on utility modules.**

The backend is tested with Jest + Supertest. The service/database layer (`services/db.js`) is mocked via `jest.unstable_mockModule`, so tests run without a live Supabase instance. Utility modules (`validation.js`, `errors.js`) are tested directly with 100% / 88% statement coverage.

This satisfies the CSC 307 rubric because:
- Route handlers contain the non-trivial authorization, validation, and business logic
- The database (`db.js`) is a thin Supabase adapter; its logic is tested indirectly through Supertest
- `validation.js` — the pure-function core of all input validation — has **100% statement, branch, function, and line coverage**
- Guest flow routes (`guest.js`) have **87% statement coverage**

---

## Test Files

| File | What Is Tested | Tests |
|------|---------------|-------|
| `accessControl.test.js` | Auth middleware (401/403), host ownership checks | 8 |
| `apiValidation.test.js` | Input validation — missing fields, invalid UUIDs, bad status values | 4 |
| `studentQueueAccess.test.js` | Role enforcement: student vs professor for queue join | 4 |
| `notFoundAndHealth.test.js` | 404 cases, `GET /health` liveness check | 5 |
| `guestFlow.test.js` | All public guest routes: join, queue view, entry status, leave queue, ordering | 22 |
| `validation.test.js` | Pure unit tests for `validateUuid`, `validateRequiredTrimmedString`, `getTrimmedString` | 31 |
| `sessionManagement.test.js` | Session create/close, queue ordering (12 students), status transitions, session lookup | 20 |

**Total: 94 tests across 7 suites.**

> The `sessionManagement` suite specifically covers the "real engineering story": session lifecycle (create, close, lookup), queue ordering with 12 students, and every status transition — making it the most recruiter-relevant test suite.

---

## How to Run Tests

```bash
# From repo root — run all backend tests
npm test

# From backend workspace
cd packages/express-backend
npm test
```

---

## How to Run Coverage

```bash
# From repo root
npm run test:coverage

# From backend workspace
cd packages/express-backend
npm run test:coverage
```

Coverage output prints to the terminal (text summary + per-file breakdown).  
`coverage/` HTML report is written to `packages/express-backend/coverage/` and is git-ignored.

---

## Latest Coverage Summary

*(Run `npm run test:coverage` to regenerate)*

```
File               | % Stmts | % Branch | % Funcs | % Lines
utils/validation   |   100   |   100    |   100   |   100
utils/errors       |   88.2  |    50    |   71.4  |   88.2
routes/guest.js    |   86.8  |   86.8   |   100   |   85.3
middleware/auth.js |   61.1  |    75    |   66.7  |   61.1
routes/api.js      |   21.8  |   18.0   |   18.5  |   23.5
```

**Key coverage notes:**
- `validation.js` → 100% across all metrics — the core validation layer is fully covered
- `guest.js` → 87% statements, 100% functions — all guest student routes are covered
- `api.js` → lower because it is an 800-line route file; the routes are tested via Supertest but not every branch within each handler is exercised
- `auth.js` → 61% because the success path is not exercised by tests that mock the auth layer

---

## Test Architecture

Tests use ES module mocking (`jest.unstable_mockModule`) to isolate the route layer from Supabase:

```javascript
jest.unstable_mockModule("../config/supabase.js", () => ({
  supabase: { auth: { getUser: mockGetUser } },
  supabaseAdmin: {}
}));
jest.unstable_mockModule("../services/db.js", () => mockDb);
```

**Why this approach:**
- Tests run in CI without a live Supabase instance or real credentials
- Route logic, auth middleware, and validation are all tested through HTTP
- Pure utility functions (`validation.js`) are tested without HTTP overhead

---

## Continuous Integration

Tests run automatically on every push and pull request via GitHub Actions:

```yaml
# .github/workflows/ci-testing.yml
- npm ci
- npm run build
- npm run lint
- npm test
```

---

## Limitations

- `db.js` is not independently unit-tested — its Supabase calls are mocked at the module level
- Frontend (React) does not have automated test coverage — manual testing only
- `scheduleClock.js` has low coverage (9%) — this utility is not exercised by current test scenarios
- Load/stress testing and end-to-end Cypress tests are not currently implemented
