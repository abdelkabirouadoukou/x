import { useEffect, useRef, useState } from "react";

const COMMAND = "bun create thexjs-app@latest";

/**
 * Dark CTA — near-black slab with a breathing terminal cursor and a copy
 * button, mirroring bun.sh's "Try it right now" section.
 */
export default function TryItNow() {
  const [copied, setCopied] = useState(false);
  const [typed, setTyped] = useState(0);
  const [done, setDone] = useState(false);
  const raf = useRef(false);

  useEffect(() => {
    if (raf.current) return;
    raf.current = true;
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(i);
      if (i > COMMAND.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, 30);
    return () => window.clearInterval(id);
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(COMMAND);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = COMMAND;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="relative mx-auto w-full max-w-container px-gutter">
      <div className="cut relative flex w-full flex-col items-center overflow-hidden border border-line-strong bg-slab px-6 py-16 text-on-slab sm:px-12 [--cut:14px]">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <p className="label text-accent">Try it right now</p>
          <p className="display mt-4 text-[2.4rem] leading-[1.02] sm:text-[3rem]">
            Run a real X app in seconds.
          </p>
          <p className="mt-4 max-w-[46ch] text-[15.5px] leading-relaxed text-on-slab/70">
            One command scaffolds a complete project: pages, API routes, auth, and the build
            pipeline.
          </p>
          <div className="cmd-slab mt-8 flex h-[54px] w-full max-w-[30rem] items-stretch [--cut:10px]">
            <code className="readout scroll-none flex min-w-0 flex-1 items-center overflow-x-auto whitespace-nowrap px-5 font-mono text-[15px] text-[#f2f2f0]">
              <span className="mr-2 select-none text-[#70d6a3]">$</span>
              {COMMAND.slice(0, typed)}
              {!done && (
                <span className="animate-blink ml-px inline-block h-[1.05em] w-[0.55em] bg-[#70d6a3] align-text-bottom" />
              )}
            </code>
            <button
              type="button"
              onClick={copy}
              aria-label="Copy command"
              className="inline-flex w-14 shrink-0 items-center justify-center border-l border-white/15 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <span className="text-[#28dc82]">✓</span>
              ) : (
                <span className="text-[13px]">Copy</span>
              )}
            </button>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <a
              href="/docs/installation"
              className="cut h-10 border border-white/20 bg-white/5 px-4 text-sm font-medium text-on-slab transition-colors hover:bg-white/10 [--cut:7px]"
            >
              Install X
            </a>
            <a
              href="/sandbox"
              className="cut btn-accent h-10 px-4 text-sm font-semibold text-white [--cut:7px]"
            >
              Open the sandbox
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
