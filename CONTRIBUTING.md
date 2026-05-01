# Contributing

This repo uses a monorepo layout with a React frontend and an Express backend.
Keep shared tooling at the repo root and package-specific tooling inside each
package.

## Project Structure

```text
packages/
  react-frontend/
  express-backend/
```

## Setup

Install dependencies from the repo root:

```bash
npm install
```

## Formatting

Prettier is configured at the repo root in `.prettierrc`.

Before opening a pull request, run:

```bash
npm run format
```

Use the same Prettier settings in your editor so formatting stays consistent
across the team.

## Linting

ESLint is configured separately for the frontend and backend because browser
React code and Node.js server code have different runtime globals.

Run all package linters:

```bash
npm run lint
```

Run one package linter:

```bash
npm run lint --workspace @cachemeoutside/react-frontend
npm run lint --workspace @cachemeoutside/express-backend
```

## Git Workflow

Pull before you start work:

```bash
git pull origin main
```

Create a feature branch for non-trivial work:

```bash
git checkout -b feature/short-description
```

Before pushing, check your work:

```bash
npm run format
npm run lint
git status
```

Push your branch and open a pull request:

```bash
git push origin feature/short-description
```

Keep pull requests focused on one feature or fix. Mention any database,
environment variable, or setup changes in the pull request description.

## Editor Integration

Each teammate should install editor integrations for Prettier and ESLint:

- Prettier editor integrations: https://prettier.io/docs/en/editors
- ESLint editor integrations: https://eslint.org/docs/latest/use/integrations
