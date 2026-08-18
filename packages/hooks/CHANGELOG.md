# @thexjs/hooks

## 0.2.0

### Minor Changes

- e7788a1: Add the `@thexjs/hooks` workspace package: SSR-safe React hooks for x apps
  (`useDebounce`, `useLocalStorage`, `useMediaQuery`, `useIntersectionObserver`,
  `useEventListener`, `useClickOutside`, `usePrevious`, `useCopyToClipboard`,
  `useOnlineStatus`, `useServerAction`, `useForm`). Every hook is safe inside
  `renderToString`/`renderToReadableStream` and ships with SSR-safety +
  behavioral tests. Wire the package into `build:packages`, add a `useServerAction`
  integration test against the server-function RPC contract, and add a `--hooks`
  option to `create-thexjs-app`.

## 0.1.0

### Minor Changes

- Initial release: SSR-safe hooks for debounce, localStorage, media queries,
  intersection observer, event listeners, click-outside, previous value,
  clipboard, online status, server actions, and forms.