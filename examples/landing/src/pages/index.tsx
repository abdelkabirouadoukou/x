import { Island } from "@thexjs/core";
import { ArrowRight } from "lucide-react";
import ApiTabs from "../components/api-tabs";
import Benchmarks from "../components/benchmarks";
import CompareTable from "../components/compare-table";
import FeatureGrid from "../components/feature-grid";
import HeroDemo from "../components/hero-demo";
import InstallCommand from "../components/install-command";
import SandboxSlot from "../components/sandbox-slot";
import Stats from "../components/stats";
import Tour from "../components/tour";
import TryItNow from "../components/try-it-now";

export const islands = {
  InstallCommand,
  HeroDemo,
  Benchmarks,
  Tour,
  ApiTabs,
  CompareTable,
  TryItNow,
};

export const mode = "static";

export default function HomePage() {
  return (
    <div className="pb-24">
      {/* --------------------------------------------------------------- Hero */}
      <section className="mx-auto w-full max-w-container px-gutter pb-14 pt-8 sm:pt-12">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-subtle px-3 py-1 text-[12px] font-medium text-fg-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              New in X 1.3: islands to disk and an image proxy
            </span>

            <h1 className="display mt-5 text-[clamp(2.4rem,5.5vw,3.9rem)]">
              High‑speed web apps with <span className="whitespace-nowrap">X</span>
            </h1>

            <p className="mt-5 max-w-[46ch] text-[1.09rem] leading-relaxed text-fg-muted">
              X is a fullstack React framework for Bun. Your folder structure is the router, your
              API lives beside your pages, and static pages, SSR, and server functions all run in{" "}
              <span className="text-fg">one process</span>.
            </p>

            <div className="mt-8">
              <Island name="InstallCommand" client="idle">
                <InstallCommand />
              </Island>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="/docs" className="al-link group text-[15px]">
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="/sandbox"
                className="inline-flex items-center gap-1 text-[14.5px] text-fg-muted underline decoration-line underline-offset-4 transition-colors hover:text-fg"
              >
                Try it in the browser
                <ArrowRight className="h-3.5 w-3.5 transition-transform hover:translate-x-0.5" />
              </a>
            </div>
          </div>

          <div className="lg:pl-4">
            <Island name="HeroDemo" client="visible">
              <HeroDemo />
            </Island>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Grid */}
      <section className="mx-auto w-full max-w-container px-gutter pt-20 sm:pt-24">
        <div className="max-w-2xl">
          <p className="label">The toolkit</p>
          <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3rem)]">Four tools. One process.</h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted">
            Everything X ships is designed to compose: routing, rendering, data, and auth all speak
            the same file-tree language.
          </p>
        </div>
        <div className="mt-12">
          <FeatureGrid />
        </div>
      </section>

      {/* ------------------------------------------------------------ Tour */}
      <section className="mx-auto w-full max-w-container px-gutter py-24">
        <div className="max-w-2xl">
          <p className="label">A minute with X</p>
          <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3rem)]">
            From zero to a running app in 60 seconds.
          </h2>
          <p className="mt-4 max-w-[42ch] text-[15.5px] leading-relaxed text-fg-muted">
            The tour plays through the five steps where a framework either earns its keep or
            doesn't: scaffolding, routes, APIs, data, and deploys. One terminal, no cuts.
          </p>
        </div>
        <div className="mt-12">
          <Island name="Tour" client="visible">
            <Tour />
          </Island>
        </div>
      </section>

      {/* ----------------------------------------------------------- Stats */}
      <section className="mx-auto w-full max-w-container px-gutter pb-16">
        <Stats />
      </section>

      {/* --------------------------------------------------------- Release */}
      <section className="mx-auto w-full max-w-container px-gutter py-12">
        <div className="md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-start md:gap-16">
          <div>
            <p className="label">Speed</p>
            <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3rem)]">
              It's fast. Here's the evidence.
            </h2>
            <p className="mt-4 max-w-[38ch] text-[15.5px] leading-relaxed text-fg-muted">
              Every step below has been measured against the same page source on the same machine.
              Change the tab, watch the bars.
            </p>
          </div>
          <div className="mt-10 md:mt-0">
            <Island name="Benchmarks" client="visible">
              <Benchmarks />
            </Island>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ API */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-container px-gutter py-24">
          <div className="max-w-2xl">
            <p className="label">Batteries included</p>
            <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3rem)]">
              Everything you need is already there.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-fg-muted">
              Routes, data, auth, content, and config each expose a small typed API that reads like
              the file it lives in.
            </p>
          </div>
          <Island name="ApiTabs" client="visible">
            <ApiTabs />
          </Island>
        </div>
      </section>

      {/* ----------------------------------------------------- Comparison */}
      <section className="mx-auto w-full max-w-container px-gutter py-24">
        <div className="flex items-end justify-between gap-6">
          <div className="max-w-2xl">
            <p className="label">Compare</p>
            <h2 className="display mt-4 text-[clamp(2rem,4.5vw,3rem)]">How X stacks up.</h2>
          </div>
          <p className="hidden text-[13.5px] text-fg-faint md:block">
            Statuses reflect the documented capabilities of each framework.
          </p>
        </div>
        <Island name="CompareTable" client="visible">
          <CompareTable />
        </Island>
      </section>

      {/* ---------------------------------------------------------- Sandbox */}
      <section className="mx-auto w-full max-w-container px-gutter">
        <SandboxSlot />
      </section>

      {/* ------------------------------------------------------------- CTA */}
      <section className="py-24">
        <TryItNow />
      </section>
    </div>
  );
}
