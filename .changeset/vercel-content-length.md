---
"@thexjs/adapter-vercel": patch
---

`sendWebResponse` no longer forwards a stale `Content-Length` on streamed bodies. The length is now dropped and Node negotiates chunked transfer-encoding, so a stream that emits fewer bytes than the upstream declared no longer hangs the client or destroys the socket with `ERR_HTTP_CONTENT_LENGTH_MISMATCH`. A computed length is only set when buffering a 206 partial-content body.
