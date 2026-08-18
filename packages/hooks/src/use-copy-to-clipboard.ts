import { useCallback, useState } from "react";

/**
 * Clipboard copy with an async Clipboard API preference and a
 * execCommand("copy") fallback for older browsers/non-secure contexts.
 * Returns `[copiedText, copy]` where `copiedText` is the last successfully
 * copied string or `null`. SSR-safe — no window access during render.
 */
export function useCopyToClipboard(): [string | null, (text: string) => Promise<boolean>] {
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for http(s) contexts without the Clipboard API.
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand("copy");
        textarea.remove();
        if (!ok) return false;
      }
      setCopiedText(text);
      return true;
    } catch {
      return false;
    }
  }, []);

  return [copiedText, copy];
}
