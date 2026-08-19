---
"@thexjs/core": patch
---

Add a global error boundary on the Bun serve path: createApp now exposes an `error` hook and guards the top of the fetch handler, so a thrown loader/API/handler error returns a clean 500 instead of taking down the process. Revalidation JSON body parsing is guarded (400 on malformed JSON), the streaming SSR pump tolerates a closed/aborted controller, and the generated production entry routes `uncaughtException`/`unhandledRejection` through the error reporter. Also closes a double-percent-encoding gap in the markdown link sanitizer: `isSafeLinkUrl` now decodes repeatedly (bounded) so double- and triple-encoded `javascript:` URLs are rejected like every other bypass.
