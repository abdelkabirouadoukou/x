import { useEffect, useState } from "react";

/**
 * Whether the browser is currently online. SSR-safe: defaults to `true` on
 * the server (matches the pre-network default in most pages) and tracks the
 * `online`/`offline` events after mount. If you need the true initial value
 * on the client, read it yourself with navigator.onLine on the first effect.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return online;
}
