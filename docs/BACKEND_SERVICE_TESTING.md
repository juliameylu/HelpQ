# Backend Service Testing Report

Our project uses Jest to test backend service logic.

## File Tested

`packages/express-backend/src/services/scheduleSync.js`

This service is responsible for syncing scheduled office hours with live
sessions. The tests mock the database service and check that scheduled sessions
are created, skipped, or closed at the right time.

## How To Run

```sh
npm run test:coverage
```

## Latest Coverage

Running `npm run test:coverage` shows 100% statement, branch, function, and line
coverage for `scheduleSync.js`.

The generated HTML report is created at
`packages/express-backend/coverage/lcov-report/index.html` after running the
command.
