"use client";

import { useEffect, useState } from "react";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

let listeners: Array<() => void> = [];

/** Any component (e.g. the command palette) can call this directly. */
export function fireShootingStar() {
  for (const fn of listeners) fn();
}

export function EasterEgg() {
  const [runId, setRunId] = useState(0);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    const trigger = () => {
      setRunId((n) => n + 1);
      setToast(true);
      window.setTimeout(() => setToast(false), 2600);
    };
    listeners.push(trigger);

    let buffer: string[] = [];
    function onKeyDown(e: KeyboardEvent) {
      buffer.push(e.key.length === 1 ? e.key.toLowerCase() : e.key);
      buffer = buffer.slice(-KONAMI.length);
      if (buffer.length === KONAMI.length && buffer.every((k, i) => k === KONAMI[i])) {
        trigger();
        buffer = [];
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      listeners = listeners.filter((fn) => fn !== trigger);
    };
  }, []);

  return (
    <>
      {runId > 0 && <span key={runId} className="shooting-star run" aria-hidden="true" />}
      {toast && (
        <output className="fixed bottom-5 left-1/2 z-[210] -translate-x-1/2 rounded-full border border-border bg-card px-4 py-2 text-xs font-medium shadow-lg">
          ✨ You found the shortcut. Press{" "}
          <kbd className="mx-0.5 rounded border border-border px-1 font-mono">⌘K</kbd> for more.
        </output>
      )}
    </>
  );
}
