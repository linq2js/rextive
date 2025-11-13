/**
 * Creates a promise that resolves after a specified delay.
 *
 * @param ms - The delay in milliseconds
 * @returns A promise that resolves to void after the delay
 */
export function delay(ms: number): Promise<void>;

/**
 * Creates a promise that resolves with a value after a specified delay.
 *
 * @param ms - The delay in milliseconds
 * @param value - The value to resolve with after the delay
 * @returns A promise that resolves to the provided value after the delay
 */
export function delay<T>(ms: number, value: T): Promise<T>;

/**
 * Implementation of the delay function that handles both overloads.
 * Creates a promise that resolves after the specified milliseconds,
 * optionally with a provided value.
 */
export function delay(ms: number, value?: any): Promise<any> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
