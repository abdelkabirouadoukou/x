import { createContext, type ReactNode, useContext } from "react";

export type IslandMode = "idle" | "visible" | "load";

export interface IslandEntry {
  name: string;
  id: string;
}

export interface IslandRegistry {
  entries: IslandEntry[];
  /** Per-request id counter, so island ids never cross request boundaries. */
  nextId: number;
}

export function createIslandRegistry(): IslandRegistry {
  return { entries: [], nextId: 0 };
}

const IslandContext = createContext<IslandRegistry | null>(null);

export function IslandProvider({
  registry,
  children,
}: {
  registry: IslandRegistry;
  children?: ReactNode;
}) {
  return <IslandContext.Provider value={registry}>{children}</IslandContext.Provider>;
}

export function Island({
  name,
  client = "idle",
  children,
}: {
  name: string;
  client?: IslandMode;
  children?: ReactNode;
}) {
  const registry = useContext(IslandContext);
  if (registry) {
    const id = `x-island-${registry.nextId++}`;
    registry.entries.push({ name, id });
    return (
      <div data-island={name} data-island-id={id} data-island-client={client}>
        {children}
      </div>
    );
  }
  return (
    <div data-island={name} data-island-id="x-island-0" data-island-client={client}>
      {children}
    </div>
  );
}
