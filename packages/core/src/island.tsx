import { type ReactNode, createContext, createElement, useContext, useId } from "react";

export type IslandMode = "idle" | "visible" | "load";

export interface IslandEntry {
  name: string;
  id: string;
}

export function createIslandRegistry(): { entries: IslandEntry[] } {
  return { entries: [] };
}

const IslandContext = createContext<{ entries: IslandEntry[] } | null>(null);

export function IslandProvider({
  registry,
  children,
}: {
  registry: { entries: IslandEntry[] };
  children?: ReactNode;
}) {
  return createElement(IslandContext.Provider, {
    value: registry,
    children,
  });
}

export function Island({
  name,
  client = "idle",
  children,
}: {
  name: string;
  client?: IslandMode;
  children: ReactNode;
}) {
  const registry = useContext(IslandContext);
  const id = useId();

  if (registry) {
    registry.entries.push({ name, id });
  }

  return createElement(
    "div",
    {
      "data-island": name,
      "data-island-id": id,
      "data-island-client": client,
    },
    children,
  );
}
