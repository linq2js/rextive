/**
 * Rextive Test Utilities
 *
 * This module provides testing utilities for rextive applications.
 *
 * @example
 * ```ts
 * import { mockLogic } from "rextive/test";
 * import { signal } from "rextive";
 *
 * const $auth = mockLogic(authLogic);
 *
 * beforeEach(() => {
 *   $auth.default({
 *     user: signal(null),
 *     isAuthenticated: signal(false),
 *   });
 * });
 *
 * afterEach(() => $auth.clear());
 * ```
 *
 * @packageDocumentation
 */

export { mockLogic, type LogicMock, type MockableShape } from "./mockLogic";
