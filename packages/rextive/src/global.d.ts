import type { DevTools } from "./types";

declare global {
  // eslint-disable-next-line no-var
  var __REXTIVE_DEVTOOLS__: DevTools | undefined;
}

