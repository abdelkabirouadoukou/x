import type { RouteProps } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import { CodeBlock } from "../../../components/code-block";

export const mode = "static";

export default function DocPage(_props: RouteProps) {
  return (
    <div>
      <p className="label">Packages</p>
      <h1 className="display mt-2 text-[clamp(1.9rem,4vw,2.6rem)] leading-[0.95]">@thexjs/hooks</h1>
      <p className="mt-3 max-w-[56ch] text-[15px] leading-relaxed text-fg-muted">
        SSR-safe React hooks for X apps. Every hook is safe inside{" "}
        <span className="text-foreground">renderToString</span> /{" "}
        <span className="text-foreground">renderToReadableStream</span> — none of them touch{" "}
        <span className="text-foreground">window</span>,{" "}
        <span className="text-foreground">document</span>,{" "}
        <span className="text-foreground">localStorage</span>, or{" "}
        <span className="text-foreground">navigator</span> during the server render pass. DOM access
        only happens in effects, after hydration.
      </p>

      <CodeBlock label="terminal" lang="bash" code="bun add @thexjs/hooks" />
      <p className="mt-4 text-muted-foreground">
        Requires React 18 or 19. For the dev UX in a new app, choose the Hooks feature from{" "}
        <span className="text-foreground">create-thexjs-app</span> to get it pre-installed.
      </p>

      <h2 className="text-xl">Hooks</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-border">
              <th className="py-2 pr-4 font-medium text-foreground">Hook</th>
              <th className="py-2 pr-4 font-medium text-foreground">Purpose</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                useDebounce(value, delayMs)
              </td>
              <td className="py-2 pr-4">Debounced value for search inputs, resize logic, etc.</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                useLocalStorage(key, initial)
              </td>
              <td className="py-2 pr-4">
                localStorage-backed state, syncs across tabs via the storage event
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">useMediaQuery(query)</td>
              <td className="py-2 pr-4">
                Boolean from matchMedia; false on the server, hydrates on mount
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                useIntersectionObserver(ref, options)
              </td>
              <td className="py-2 pr-4">
                Intersection entry for lazy-loading, infinite scroll, on-view analytics
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                useEventListener(event, handler, target?)
              </td>
              <td className="py-2 pr-4">Typed addEventListener with automatic cleanup</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                useClickOutside(ref, handler)
              </td>
              <td className="py-2 pr-4">Pointer-down outside a ref (dropdowns, modals)</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">usePrevious(value)</td>
              <td className="py-2 pr-4">Value from the previous render</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">useCopyToClipboard()</td>
              <td className="py-2 pr-4">
                [copiedText, copy]; async Clipboard API + execCommand fallback
              </td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">useOnlineStatus()</td>
              <td className="py-2 pr-4">navigator.onLine + online/offline listeners</td>
            </tr>
            <tr className="border-b border-border">
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">useServerAction(fn)</td>
              <td className="py-2 pr-4">
                {"{ data, error, isPending }"} + run over a server-function client
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 whitespace-nowrap text-foreground">
                useForm(initialValues, validate)
              </td>
              <td className="py-2 pr-4">
                Lightweight form state + validation (zod, valibot, or hand-written)
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-xl">Example</h2>
      <CodeBlock
        label="search.tsx"
        code={`import { useDebounce, useServerAction } from "@thexjs/hooks";

function Search() {
  const [query, setQuery] = useState("");
  const q = useDebounce(query, 300);

  return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
}

function LikeButton() {
  // \`like\` is a server function from the generated client
  const [{ isPending, error }, run] = useServerAction(like);
  return <button onClick={() => run()}>{isPending ? "..." : "Like"}</button>;
}`}
      />

      <h2 className="text-xl">Server actions</h2>
      <p className="mt-3 text-[14.5px] leading-relaxed text-fg-muted">
        <span className="text-foreground">useServerAction</span> expects an async function that
        talks to your server function endpoint — usually one from the client generated by{" "}
        <span className="text-foreground">@thexjs/core</span>'s build step (
        <span className="text-foreground">generateServerFunctionClient</span> output). It adds the
        mutation-hook ergonomics:{" "}
        <span className="text-foreground">{"{ data, error, isPending }"}</span> plus a{" "}
        <span className="text-foreground">run(...args)</span> trigger.
      </p>

      <div className="mt-16 flex flex-wrap gap-6 border-t border-border pt-8">
        <a
          href="/docs/packages/adapter-vercel"
          className="inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          @thexjs/adapter-vercel <ArrowRight className="h-3.5 w-3.5" />
        </a>
        <a
          href="/docs"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5 rotate-180" /> Back to docs
        </a>
      </div>
    </div>
  );
}
