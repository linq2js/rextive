/**
 * Helper functions for extracting values from React input events.
 * Use with focus.lens().map() for convenient input binding.
 *
 * @example
 * ```tsx
 * import { focus } from "rextive/op";
 * import { inputValue } from "rextive/react";
 *
 * const [getValue, onChange] = focus.lens(state, "email").map(inputValue);
 * <input value={getValue()} onChange={onChange} />
 * ```
 */

import type { ChangeEvent } from "react";

/**
 * Extract string value from input element change event.
 */
export const inputValue = (e: ChangeEvent<HTMLInputElement>): string =>
  e.currentTarget.value;

/**
 * Extract checked boolean from checkbox/radio change event.
 */
export const inputChecked = (e: ChangeEvent<HTMLInputElement>): boolean =>
  e.currentTarget.checked;

/**
 * Extract numeric value from input element change event.
 * Returns NaN if the value is not a valid number.
 */
export const inputNumber = (e: ChangeEvent<HTMLInputElement>): number =>
  Number(e.currentTarget.value);

/**
 * Extract integer value from input element change event.
 * Returns NaN if the value is not a valid integer.
 */
export const inputInt = (e: ChangeEvent<HTMLInputElement>): number =>
  parseInt(e.currentTarget.value, 10);

/**
 * Extract float value from input element change event.
 * Returns NaN if the value is not a valid float.
 */
export const inputFloat = (e: ChangeEvent<HTMLInputElement>): number =>
  parseFloat(e.currentTarget.value);

/**
 * Extract string value from select element change event.
 */
export const selectValue = (e: ChangeEvent<HTMLSelectElement>): string =>
  e.currentTarget.value;

/**
 * Extract string value from textarea element change event.
 */
export const textareaValue = (e: ChangeEvent<HTMLTextAreaElement>): string =>
  e.currentTarget.value;

/**
 * Extract FileList from file input change event.
 */
export const inputFiles = (
  e: ChangeEvent<HTMLInputElement>
): FileList | null => e.currentTarget.files;

/**
 * Extract first File from file input change event.
 */
export const inputFile = (e: ChangeEvent<HTMLInputElement>): File | undefined =>
  e.currentTarget.files?.[0];

