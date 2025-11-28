/**
 * Validation utilities for integrating with validation libraries like Zod, Yup, etc.
 *
 * This module provides a unified way to wrap various validator patterns into a
 * consistent result format that works well with signal transformations.
 *
 * **Note:** This utility supports **synchronous validation only**. For async validation
 * (e.g., server-side uniqueness checks), chain an async selector after `validate()`.
 * See the `validate()` function documentation for the async pattern.
 *
 * @module validate
 */

/**
 * Extract the error type from a validation result.
 *
 * If the result type has an `error` property, extract its type.
 * Otherwise, fall back to `unknown`.
 *
 * @example
 * ```ts
 * // Zod's safeParse returns { success: boolean, error?: ZodError }
 * type ZodErr = ValidationError<{ error?: ZodError }>; // ZodError
 *
 * // Simple boolean validator has no error type
 * type SimpleErr = ValidationError<boolean>; // unknown
 * ```
 */
export type ValidationError<R> = R extends { error?: infer E }
  ? Exclude<E, undefined | null>
  : unknown;

/**
 * Unified validation result type.
 *
 * Contains the original value, success status, and either the validation
 * result (on success) or error (on failure).
 *
 * @template T - The type of the value being validated
 * @template R - The return type of the validator function
 *
 * @example
 * ```ts
 * // Success case
 * const success: ValidationResult<string, boolean> = {
 *   value: "hello",
 *   success: true,
 *   result: true,
 * };
 *
 * // Failure case
 * const failure: ValidationResult<string, boolean> = {
 *   value: "hello",
 *   success: false,
 *   error: new Error("Validation failed"),
 * };
 * ```
 */
export type ValidationResult<T, R> =
  | {
      /** The original value that was validated */
      value: T;
      /** Whether validation succeeded */
      success: boolean;
      /** The error that occurred during validation */
      error: ValidationError<R>;
    }
  | {
      /** The original value that was validated */
      value: T;
      /** Whether validation succeeded */
      success: boolean;
      /** The result returned by the validator */
      result: R;
    };

/**
 * Create a validation function that wraps various validator patterns.
 *
 * This utility normalizes different validation approaches into a unified result format:
 *
 * 1. **Function validators** - `(value) => result`
 *    - Zod's `schema.safeParse`
 *    - Custom validation functions
 *
 * 2. **Object validators** - `{ isValid: (value) => result }`
 *    - Yup's schema (where `isValid` is not bound to the schema)
 *
 * 3. **Boolean return** - Returns `true`/`false`
 *    - Simple predicates like `(x) => x > 0`
 *
 * 4. **Throwing validators** - Throws on invalid
 *    - Caught and converted to error result
 *
 * @template T - The type of value being validated
 * @template R - The return type of the validator
 *
 * @param validator - A validation function or object with `isValid` method
 * @returns A curried function that takes a value and returns a ValidationResult
 *
 * @example With Zod
 * ```ts
 * import { z } from "zod";
 * import { validate } from "rextive";
 *
 * const schema = z.object({ name: z.string() });
 * const person = signal({ name: "John" });
 *
 * // Use with .to() for reactive validation
 * const validated = person.to(validate(schema.safeParse));
 *
 * console.log(validated().success); // true
 * console.log(validated().value);   // { name: "John" }
 * ```
 *
 * @example With Yup
 * ```ts
 * import * as yup from "yup";
 * import { validate } from "rextive";
 *
 * const schema = yup.object({ name: yup.string() });
 * const person = signal({ name: "John" });
 *
 * // Note: Pass the schema object, not schema.isValid (it's not bound)
 * const validated = person.to(validate(schema));
 *
 * console.log(validated().success); // true
 * ```
 *
 * @example With simple predicate
 * ```ts
 * const isPositive = (x: number) => x > 0;
 * const count = signal(5);
 *
 * const validated = count.to(validate(isPositive));
 *
 * console.log(validated().success); // true
 * console.log(validated().result);  // true
 *
 * count.set(-1);
 * console.log(validated().success); // false
 * console.log(validated().result);  // false
 * ```
 *
 * @example With throwing validator
 * ```ts
 * const mustBePositive = (x: number) => {
 *   if (x <= 0) throw new Error("Must be positive");
 *   return x;
 * };
 *
 * const validated = count.to(validate(mustBePositive));
 *
 * count.set(-1);
 * console.log(validated().success); // false
 * console.log(validated().error);   // Error: Must be positive
 * ```
 *
 * @note **Sync validation only.** This utility is designed for synchronous validation.
 * If you need async validation (e.g., server-side checks), chain an async selector
 * after the sync validation:
 *
 * @example Async validation pattern
 * ```ts
 * import { signal } from "rextive";
 * import { validate } from "rextive";
 *
 * const username = signal("guest");
 *
 * // Chain sync validation with async validation
 * const validated = username.to(
 *   // Step 1: Sync validation (client-side)
 *   validate((name) => name.length >= 3),
 *
 *   // Step 2: Async validation (server-side)
 *   async (result) => {
 *     // Skip server check if client validation failed
 *     if (!result.success) {
 *       return result;
 *     }
 *
 *     // Perform async validation
 *     const response = await fetch(`/api/check-username/${result.value}`);
 *     const { available } = await response.json();
 *
 *     return {
 *       value: result.value,
 *       success: available,
 *       error: available ? undefined : "Username is taken",
 *     };
 *   }
 * );
 *
 * // Result is a Promise due to async selector
 * const result = await validated();
 * console.log(result.success); // true if valid and available
 * ```
 */
export function validate<T, R>(
  validator: ((value: NoInfer<T>) => R) | { isValid: (value: NoInfer<T>) => R }
) {
  return (value: T): ValidationResult<T, R> => {
    try {
      // Handle both function validators and object validators (like Yup schemas)
      // Yup's isValid method is not bound to the schema, so we need to call it
      // on the object to preserve the correct `this` context
      const result =
        typeof validator === "function"
          ? validator(value)
          : validator.isValid(value);

      // If the validator returns a boolean (like simple predicates or Yup's isValid),
      // use that boolean directly as the success status
      if (typeof result === "boolean") {
        return {
          success: result,
          value,
          result,
        };
      }

      if (typeof result === "object" && result !== null) {
        if ("error" in result && result.error) {
          return {
            value,
            success: false,
            error: result.error as ValidationError<R>,
          };
        }
      }

      // For validators that return complex objects (like Zod's safeParse),
      // assume success since no error was thrown
      return {
        value,
        result,
        success: true,
      };
    } catch (error) {
      // Catch any thrown errors and convert to failure result
      // This handles validators that throw on invalid input
      return {
        value,
        success: false,
        error: error as ValidationError<R>,
      };
    }
  };
}
