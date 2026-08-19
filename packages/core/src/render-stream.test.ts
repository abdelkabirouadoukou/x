import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { pumpStreamingResponse, renderStreamingPage } from "./render";

const encoder = new TextEncoder();

function bytes(chunks: string[]): Uint8Array[] {
  return chunks.map((c) => encoder.encode(c));
}

async function collect(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  let out = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    out += new TextDecoder().decode(value);
  }
  return out;
}

/** A source that never resolves until resolve() is called. */
function hangingSource() {
  let resolveRead: (() => void) | null = null;
  const readPromise = new Promise<void>((r) => {
    resolveRead = r;
  });
  const source = new ReadableStream<Uint8Array>({
    async pull() {
      await readPromise;
    },
  });
  return { source, release: () => resolveRead?.() };
}

function toStream(chunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const chunk = chunks[i++];
      if (chunk !== undefined) {
        controller.enqueue(chunk);
        return;
      }
      controller.close();
    },
  });
}

describe("pumpStreamingResponse", () => {
  test("streams header + all source chunks + footer in order", async () => {
    const out = await collect(
      pumpStreamingResponse(toStream(bytes(["a", "b", "c"])), {
        header: encoder.encode("HEAD-"),
        footer: encoder.encode("-FOOT"),
      }),
    );
    expect(out).toBe("HEAD-abc-FOOT");
  });

  test("respects backpressure: the source is pulled incrementally, not drained up front", async () => {
    // Each source.pull() enqueues one chunk; the source only closes on the
    // 4th pull. If the pump buffered the whole source eagerly, all 4 pulls
    // would fire before the consumer reads anything.
    let sourcePulls = 0;
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        sourcePulls++;
        if (sourcePulls < 4) {
          controller.enqueue(encoder.encode(`chunk${sourcePulls}`));
          return;
        }
        controller.enqueue(encoder.encode("last"));
        controller.close();
      },
    });

    const stream = pumpStreamingResponse(source, {
      header: encoder.encode("H"),
      footer: encoder.encode("F"),
    });
    const reader = stream.getReader();
    const reads: string[] = [];

    // Read only the first chunk. The source must not have been fully drained.
    const first = (await reader.read()).value;
    reads.push(first ? new TextDecoder().decode(first) : "");
    expect(sourcePulls).toBeLessThan(4);

    // Drain the rest.
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) reads.push(new TextDecoder().decode(value));
    }
    expect(reads.join("")).toBe("Hchunk1chunk2chunk3lastF");
    expect(sourcePulls).toBe(4);
  });

  test("cancel propagates to the source reader and does not throw", async () => {
    let canceled = false;
    const source = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("partial"));
      },
      cancel() {
        canceled = true;
      },
    });

    const stream = pumpStreamingResponse(source, {
      header: encoder.encode("H"),
      footer: encoder.encode("F"),
    });
    const reader = stream.getReader();
    await reader.read();

    let cancelError: unknown = null;
    try {
      await reader.cancel("client dropped");
    } catch (err) {
      cancelError = err;
    }
    expect(cancelError).toBeNull();
    expect(canceled).toBe(true);
  });

  test("calling onCancel when consumer cancels", async () => {
    let onCancelCalled = false;
    const source = new ReadableStream<Uint8Array>({
      pull() {
        return new Promise(() => {});
      },
    });
    const stream = pumpStreamingResponse(source, {
      header: encoder.encode("H"),
      footer: encoder.encode("F"),
      onCancel: (reason) => {
        onCancelCalled = true;
        void reason;
      },
    });

    await stream.cancel("disconnect");
    expect(onCancelCalled).toBe(true);
  });

  test("reader.cancel on a hanging source does not leave an unhandled rejection", async () => {
    const { source, release } = hangingSource();
    const stream = pumpStreamingResponse(source, {
      header: encoder.encode("H"),
      footer: encoder.encode("F"),
    });
    const reader = stream.getReader();

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      await reader.cancel("disconnect");
      // Releasing the source afterwards must not resurface anything.
      release();
      await Bun.sleep(10);
      expect(unhandled).toHaveLength(0);
    } finally {
      process.off("unhandledRejection", onUnhandled);
      reader.releaseLock();
    }
  });

  test("mid-stream source error calls onRenderError once and errors the output stream", async () => {
    const onRenderErrors: unknown[] = [];
    const source = new ReadableStream<Uint8Array>({
      async pull(controller) {
        controller.enqueue(encoder.encode("ok"));
        throw new Error("boom mid-stream");
      },
    });

    const stream = pumpStreamingResponse(source, {
      header: encoder.encode("H"),
      footer: encoder.encode("F"),
      onRenderError: (err) => {
        onRenderErrors.push(err);
      },
    });
    const reader = stream.getReader();

    let readError: unknown = null;
    let output = "";
    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) output += new TextDecoder().decode(value);
      } catch (err) {
        readError = err;
        break;
      }
    }

    expect(output).toContain("ok");
    expect(readError).not.toBeNull();
    expect((readError as Error).message).toBe("boom mid-stream");
    expect(onRenderErrors).toHaveLength(1);
  });

  test("a source that fails before the first chunk still surfaces through onRenderError", async () => {
    const onRenderErrors: unknown[] = [];
    const source = new ReadableStream<Uint8Array>({
      pull() {
        throw new Error("fail on first pull");
      },
    });

    const stream = pumpStreamingResponse(source, {
      header: encoder.encode("H"),
      footer: encoder.encode("F"),
      onRenderError: (err) => {
        onRenderErrors.push(err);
      },
    });
    const reader = stream.getReader();

    let readError: unknown = null;
    let output = "";
    while (true) {
      try {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) output += new TextDecoder().decode(value);
      } catch (err) {
        readError = err;
        break;
      }
    }
    expect(output).toBe("H");
    expect(readError).not.toBeNull();
    expect((readError as Error).message).toBe("fail on first pull");
    expect(onRenderErrors).toHaveLength(1);
  });

  describe("renderStreamingPage", () => {
    test("renders a real React tree to a complete HTML document through the pump", async () => {
      const stream = await renderStreamingPage(createElement("main", null, "Hello streaming"));
      const html = await collect(stream);

      expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
      expect(html).toContain("<title>x app</title>");
      expect(html).toContain("<main>Hello streaming</main>");
      expect(html.endsWith("</html>")).toBe(true);
    });

    test("a synchronous render error rejects the promise (surfaces via the page boundary)", async () => {
      function Throws(): never {
        throw new Error("react exploded during shell");
      }
      let streamError: unknown = null;
      try {
        await renderStreamingPage(createElement(Throws));
      } catch (err) {
        streamError = err;
      }
      // A top-level (non-suspense) throw rejects before any bytes are sent, so
      // createApp's existing page boundary turns it into a clean 500.
      expect(streamError).not.toBeNull();
      expect((streamError as Error).message).toBe("react exploded during shell");
    });

    test("island scripts still land in the body footer (after content)", async () => {
      const stream = await renderStreamingPage(createElement("p", null, "x"), {
        islandScripts: ["/_islands/route/route.js"],
      });
      const html = await collect(stream);
      expect(html).toContain('<script data-island-script src="/_islands/route/route.js"></script>');
      expect(html.indexOf("<p>x</p>")).toBeLessThan(html.indexOf("/_islands/route/route.js"));
    });
  });
});
