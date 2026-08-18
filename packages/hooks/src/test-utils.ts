import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

export interface RenderHookOptions<Props> {
  initialProps: Props;
  container?: HTMLElement;
}

export type RenderHookResult<Props, T> = {
  result: { current: T };
  rerender: (nextProps: Props) => void;
  unmount: () => void;
};

/**
 * Minimal `renderHook` — renders a hook through `react-dom/client` inside the
 * happy-dom environment and returns a handle to its latest return value. No
 * testing-library dependency. Callers must set `IS_REACT_ACT_ENVIRONMENT` in
 * their test setup (see hooks.test.tsx).
 */
export function renderHook<Props, T>(
  use: (props: Props) => T,
  { initialProps, container }: RenderHookOptions<Props>,
): RenderHookResult<Props, T> {
  const host = container ?? document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);

  const result: { current: T } = { current: undefined as T };
  let props: Props = initialProps;

  const Component = () => {
    result.current = use(props);
    return null;
  };

  act(() => {
    root.render(createElement(Component));
  });

  return {
    result,
    rerender: (nextProps: Props) => {
      props = nextProps;
      act(() => {
        root.render(createElement(Component));
      });
    },
    unmount: () => {
      act(() => root.unmount());
      host.remove();
    },
  };
}
