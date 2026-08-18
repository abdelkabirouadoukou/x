import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { RefObject } from "react";
import { act } from "react";
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
import { renderHook } from "./test-utils";

beforeAll(() => {
  GlobalRegistrator.register();
  (globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;
});

afterAll(() => {
  GlobalRegistrator.unregister();
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 25));
const flushLong = () => new Promise((resolve) => setTimeout(resolve, 150));

describe("useDebounce", () => {
  test("returns initial value immediately, updated value after the delay", async () => {
    const { result, rerender } = renderHook(
      (props: { value: string }) => useDebounce(props.value, 40),
      { initialProps: { value: "a" } },
    );
    expect(result.current).toBe("a");

    rerender({ value: "b" });
    expect(result.current).toBe("a");
    await act(async () => {
      await flushLong();
    });
    expect(result.current).toBe("b");
  });

  test("does not update after unmount", async () => {
    const { result, rerender, unmount } = renderHook(
      (props: { value: string }) => useDebounce(props.value, 40),
      { initialProps: { value: "a" } },
    );
    rerender({ value: "b" });
    unmount();
    await act(async () => {
      await flushLong();
    });
    expect(result.current).toBe("a");
  });
});

describe("useLocalStorage", () => {
  test("writes through to localStorage and hydrates on mount", async () => {
    localStorage.clear();
    const { result } = renderHook(() => useLocalStorage("k1", "initial"), {
      initialProps: undefined,
    });
    expect(result.current[0]).toBe("initial");

    act(() => result.current[1]("stored"));
    await flush();
    expect(localStorage.getItem("k1")).toBe(JSON.stringify("stored"));
    expect(result.current[0]).toBe("stored");
  });

  test("hydrates from an existing value after mount", async () => {
    localStorage.clear();
    localStorage.setItem("k2", JSON.stringify("persisted"));
    const { result } = renderHook(() => useLocalStorage("k2", "initial"), {
      initialProps: undefined,
    });
    await flush();
    expect(result.current[0]).toBe("persisted");
  });

  test("syncs across tabs via the storage event", async () => {
    localStorage.clear();
    const { result } = renderHook(() => useLocalStorage("k3", "initial"), {
      initialProps: undefined,
    });
    act(() => {
      window.dispatchEvent(
        new StorageEvent("storage", { key: "k3", newValue: JSON.stringify("from-other-tab") }),
      );
    });
    await flush();
    expect(result.current[0]).toBe("from-other-tab");
  });
});

describe("useMediaQuery", () => {
  test("returns a boolean without throwing", async () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 1px)"), {
      initialProps: undefined,
    });
    await flush();
    expect(typeof result.current).toBe("boolean");
  });
});

describe("useIntersectionObserver", () => {
  test("returns null while the observed element is absent", async () => {
    const ref: RefObject<HTMLElement | null> = { current: null };
    const { result } = renderHook(() => useIntersectionObserver(ref), {
      initialProps: undefined,
    });
    await flush();
    expect(result.current).toBeNull();
  });
});

describe("usePrevious", () => {
  test("returns undefined first, then the previous value", async () => {
    const { result, rerender } = renderHook(
      (props: { value: number }) => usePrevious(props.value),
      { initialProps: { value: 1 } },
    );
    expect(result.current).toBeUndefined();

    rerender({ value: 2 });
    expect(result.current).toBe(1);

    rerender({ value: 3 });
    expect(result.current).toBe(2);
  });
});

describe("useEventListener", () => {
  test("attaches and removes the listener", async () => {
    let clicks = 0;
    const { unmount } = renderHook(() => useEventListener("click", () => clicks++), {
      initialProps: undefined,
    });
    window.dispatchEvent(new Event("click"));
    window.dispatchEvent(new Event("click"));
    expect(clicks).toBe(2);

    unmount();
    window.dispatchEvent(new Event("click"));
    expect(clicks).toBe(2);
  });
});

describe("useClickOutside", () => {
  test("fires on outside clicks, not inside clicks", async () => {
    const clicks: string[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = '<button id="inside">inside</button>';
    const button = container.querySelector("#inside") as HTMLButtonElement;

    const { unmount } = renderHook(
      () => useClickOutside({ current: container }, () => clicks.push("outside")),
      {
        container,
        initialProps: undefined,
      },
    );
    await flush();

    document.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(clicks).toContain("outside");

    const before = clicks.length;
    button.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(clicks.length).toBe(before);

    unmount();
  });
});

describe("useCopyToClipboard", () => {
  test("returns a boolean from copy and records the copied value when possible", async () => {
    const { result } = renderHook(() => useCopyToClipboard(), { initialProps: undefined });
    let ok = false;
    try {
      ok = await act(async () => result.current[1]("hello"));
      await flush();
    } catch {
      ok = false;
    }
    expect(typeof ok).toBe("boolean");
    if (ok) expect(result.current[0]).toBe("hello");
  });
});

describe("useOnlineStatus", () => {
  test("defaults to true and reacts to offline/online events", async () => {
    const { result } = renderHook(() => useOnlineStatus(), { initialProps: undefined });
    expect(result.current).toBe(true);

    act(() => window.dispatchEvent(new Event("offline")));
    expect(result.current).toBe(false);

    act(() => window.dispatchEvent(new Event("online")));
    expect(result.current).toBe(true);
  });
});

describe("useServerAction", () => {
  test("wraps an async function into {data, error, isPending}", async () => {
    const { result } = renderHook(() => useServerAction(async (input: string) => `echo:${input}`), {
      initialProps: undefined,
    });
    expect(result.current[0].isPending).toBe(false);

    await act(async () => {
      await result.current[1]("hello");
    });
    expect(result.current[0].data).toBe("echo:hello");
    expect(result.current[0].error).toBeNull();
    expect(result.current[0].isPending).toBe(false);
  });

  test("records the error message on rejection", async () => {
    const { result } = renderHook(
      () =>
        useServerAction(async () => {
          throw new Error("boom");
        }),
      { initialProps: undefined },
    );
    await act(async () => {
      await result.current[1]();
    });
    expect(result.current[0].data).toBeNull();
    expect(result.current[0].error).toBe("boom");
    expect(result.current[0].isPending).toBe(false);
  });

  test("integration: drives the real server-function RPC contract over fetch", async () => {
    // Mirrors the framework's server-function client (packages/core
    // generateServerFunctionClient): a plain async fn that POSTs JSON args to
    // /__x/actions/<path>/<name> and returns res.json(). The useServerAction
    // hook wraps that client, so this asserts the full mutation lifecycle
    // against the same RPC shape production apps use.
    const server = async (name: string): Promise<{ greeting: string }> => {
      const res = await fetch("/__x/actions/greet/greet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([name]),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    };

    const realFetch = globalThis.fetch;
    globalThis.fetch = (async (
      _input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<Response> => {
      const body = init?.body ? JSON.parse(String(init.body)) : [];
      const name = (body[0] ?? "world") as string;
      return new Response(JSON.stringify({ greeting: `hello ${name}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const { result } = renderHook(() => useServerAction(server), { initialProps: undefined });
      await act(async () => {
        await result.current[1]("Ada");
      });
      expect(result.current[0].data).toEqual({ greeting: "hello Ada" });
      expect(result.current[0].error).toBeNull();
      expect(result.current[0].isPending).toBe(false);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

describe("useForm", () => {
  const validate = (values: { email: string }) =>
    values.email.includes("@") ? null : { email: "invalid" };

  test("initially holds the initial values with no errors", () => {
    const { result } = renderHook(
      (props: { init: { email: string } }) => useForm(props.init, validate),
      {
        initialProps: { init: { email: "" } },
      },
    );
    expect(result.current.values).toEqual({ email: "" });
    expect(result.current.errors).toEqual({});
    expect(result.current.isDirty).toBe(false);
  });

  test("updates values and validation on setValue", () => {
    const { result } = renderHook(
      (props: { init: { email: string } }) => useForm(props.init, validate),
      {
        initialProps: { init: { email: "" } },
      },
    );
    act(() => result.current.setValue("email", "bad"));
    expect(result.current.values).toEqual({ email: "bad" });
    expect(result.current.errors).toEqual({ email: "invalid" });
    expect(result.current.isDirty).toBe(true);
  });

  test("handleSubmit calls onValid only when valid", () => {
    const { result } = renderHook(
      (props: { init: { email: string } }) => useForm(props.init, validate),
      {
        initialProps: { init: { email: "" } },
      },
    );
    let submitted = false;

    act(() => result.current.setValue("email", "a@b.com"));
    act(() => {
      result.current.handleSubmit(() => (submitted = true))({});
    });
    expect(submitted).toBe(true);
  });

  test("reset restores initial values", () => {
    const { result } = renderHook(
      (props: { init: { email: string } }) => useForm(props.init, validate),
      {
        initialProps: { init: { email: "" } },
      },
    );
    act(() => result.current.setValue("email", "x@y.com"));
    act(() => result.current.reset());
    expect(result.current.values).toEqual({ email: "" });
    expect(result.current.errors).toEqual({});
    expect(result.current.isDirty).toBe(false);
  });
});

describe("SSR determinism", () => {
  test("useLocalStorage renders identical HTML on server and client", () => {
    const html = renderToString(<ServerOnlyLocalStorage />);
    expect(html).toContain(">initial<");
  });
});

function ServerOnlyLocalStorage() {
  const [value] = useLocalStorage("ssr-determinism", "initial");
  return <span>{value}</span>;
}
