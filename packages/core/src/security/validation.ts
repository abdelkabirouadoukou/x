/** Allowed inbound x-request-id: 1-128 alphanumeric, hyphens, or underscores. */
export const SAFE_REQUEST_ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
