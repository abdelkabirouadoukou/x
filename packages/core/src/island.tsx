import { createContext, type ReactNode, useContext } from "react";

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
  return <IslandContext.Provider value={registry}>{children}</IslandContext.Provider>;
}

let islandCounter = 0;

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
  const id = `x-island-${islandCounter++}`;

  if (registry) {
    registry.entries.push({ name, id });
  }

  return (
    <div data-island={name} data-island-id={id} data-island-client={client}>
      {children}
    </div>
  );
}
