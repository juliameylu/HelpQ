# HelpQ

## Front End Prototype

Issue #9 has a runnable React + Tailwind student question form in `front-end`.

```bash
npm install --prefix front-end
npm run dev:frontend
```

The form currently uses local browser state for validation and confirmation.
When the backend queue API is merged, the submit handler can call the real queue
entry endpoint.
