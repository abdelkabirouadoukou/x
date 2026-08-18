import { describe, expect, test } from "bun:test";
import { renderToString } from "react-dom/server";
import {
  useClickOutside,
  useCopyToClipboard,
  useDebounce,
  useEventListener,
  useForm,
  useIntersectionObserver,
  useLocalStorage,
  useMediaQuery,
  useOnlineStatus,
  usePrevious,
  useServerAction,
} from "./index";

/**
 * SSR-safety: every hook must render inside `renderToString` without
 * touching `window`/`document` (which don't exist in this pure-Node test
 * environment — the happy-dom registrator is deliberately NOT loaded here).
 * If any hook accessed the DOM during the server pass it would throw a
 * ReferenceError and fail its test.
 */

function DebounceConsumer() {
  const value = useDebounce("initial", 100);
  return <span>{value}</span>;
}

function LocalStorageConsumer() {
  const [value] = useLocalStorage("ssr:test", "initial");
  return <span>{value}</span>;
}

function MediaQueryConsumer() {
  const matches = useMediaQuery("(min-width: 100px)");
  return <span>{String(matches)}</span>;
}

function IntersectionObserverConsumer() {
  const entry = useIntersectionObserver<HTMLDivElement>({ current: null });
  return <span>{entry === null ? "null" : "entry"}</span>;
}

function EventListenerConsumer() {
  useEventListener("click", () => {});
  return <span>listening</span>;
}

function ClickOutsideConsumer() {
  const ref = { current: null };
  useClickOutside(ref as never, () => {});
  return <span>outside</span>;
}

function PreviousConsumer({ value }: { value: string }) {
  const prev = usePrevious(value);
  return <span>{prev ?? "undefined"}</span>;
}

function CopyToClipboardConsumer() {
  const [copied] = useCopyToClipboard();
  return <span>{copied ?? "none"}</span>;
}

function OnlineStatusConsumer() {
  const online = useOnlineStatus();
  return <span>{String(online)}</span>;
}

function ServerActionConsumer() {
  const [state] = useServerAction(async () => "result");
  return <span>{state.isPending ? "pending" : "idle"}</span>;
}

function FormConsumer() {
  const form = useForm({ email: "" }, (values) =>
    values.email.includes("@") ? null : { email: "invalid" },
  );
  return <span>{form.values.email}</span>;
}

describe("SSR safety (renderToString without a DOM)", () => {
  test("all server-renderable hooks render without touching window/document", () => {
    const html = renderToString(
      <>
        <DebounceConsumer />
        <LocalStorageConsumer />
        <MediaQueryConsumer />
        <IntersectionObserverConsumer />
        <EventListenerConsumer />
        <ClickOutsideConsumer />
        <PreviousConsumer value="first" />
        <CopyToClipboardConsumer />
        <OnlineStatusConsumer />
        <ServerActionConsumer />
        <FormConsumer />
      </>,
    );
    expect(html).toBeTruthy();
  });

  test("useDebounce returns the initial value on the server", () => {
    const html = renderToString(<DebounceConsumer />);
    expect(html).toContain("initial");
  });

  test("useLocalStorage returns the initial value on the server", () => {
    const html = renderToString(<LocalStorageConsumer />);
    expect(html).toContain("initial");
  });

  test("useMediaQuery renders false on the server", () => {
    const html = renderToString(<MediaQueryConsumer />);
    expect(html).toContain("false");
  });

  test("useIntersectionObserver returns null on the server", () => {
    const html = renderToString(<IntersectionObserverConsumer />);
    expect(html).toContain("null");
  });

  test("useOnlineStatus defaults to true on the server", () => {
    const html = renderToString(<OnlineStatusConsumer />);
    expect(html).toContain("true");
  });
});
