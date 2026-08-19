---
"@thexjs/core": patch
---

Don't echo server-function error text to clients in production (closes #110):

- In production, an action that throws now returns `Internal error (id: <opaque>)`
  with the same id in the `x-x-error-id` header, instead of the raw
  `err.message`. Driver errors that embed schema details, connection strings,
  or secrets never reach the client body.
- The id is attached to the exception report context (`ErrorContext.errorId`),
  so server-side logs/APM carry the same correlation id the client can cite.
- In dev (`NODE_ENV !== "production"`) the message is still echoed, preserving
  the familiar dev experience (full error text in the terminal and console).
- Regression test: a Postgres-style `duplicate key ... "users_email_key"`
  message is proven absent from the production response body, and the opaque
  id is validated in both body and header. Pairs with #79 log redaction: the
  server stops echoing secrets to loggers *and* to clients.