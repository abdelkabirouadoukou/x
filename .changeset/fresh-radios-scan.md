---
"@thexjs/core": patch
---

Fix a link-sanitization bypass in markdown rendering: control characters (tab, newline, carriage return) embedded in a link URL's scheme portion could evade scheme allowlisting while a browser strips them before parsing, turning a blocked link into a live `javascript:`-class link. URLs are now scrubbed of these characters before scheme detection and before being written into the emitted `href`.

This shipped in 1.1.0 and is present through 1.2.0. Disclosure details are handled separately; this entry deliberately omits a working payload.