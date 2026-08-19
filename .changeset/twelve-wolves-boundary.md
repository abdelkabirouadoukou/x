---
"@thexjs/core": patch
---

Streaming SSR responses now respect backpressure and honor client disconnect:

- The SSR stream pump is pull-driven: it only reads from React's stream while
  the HTTP sink has room, so a slow consumer throttles the render instead of
  buffering unbounded chunks in memory.
- Calling `cancel()` on the response stream (client disconnect) cancels the
  underlying React reader, stopping the render instead of wasting CPU, with no
  escaping rejection.
- A render error that surfaces mid-stream now reports via a new
  `onRenderError` hook (wired in `createApp` to the error reporter +
  `x_http_errors_total` metric) instead of silently shipping a partial page.