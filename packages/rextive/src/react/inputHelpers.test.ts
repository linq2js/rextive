/**
 * Tests for input helper functions
 */
import { describe, it, expect } from "vitest";
import type { ChangeEvent } from "react";
import {
  inputValue,
  inputChecked,
  inputNumber,
  inputInt,
  inputFloat,
  selectValue,
  textareaValue,
  inputFiles,
  inputFile,
} from "./inputHelpers";

// Helper to create mock events
function createInputEvent(value: string): ChangeEvent<HTMLInputElement> {
  return {
    currentTarget: { value },
  } as ChangeEvent<HTMLInputElement>;
}

function createCheckboxEvent(checked: boolean): ChangeEvent<HTMLInputElement> {
  return {
    currentTarget: { checked },
  } as ChangeEvent<HTMLInputElement>;
}

function createSelectEvent(value: string): ChangeEvent<HTMLSelectElement> {
  return {
    currentTarget: { value },
  } as ChangeEvent<HTMLSelectElement>;
}

function createTextareaEvent(value: string): ChangeEvent<HTMLTextAreaElement> {
  return {
    currentTarget: { value },
  } as ChangeEvent<HTMLTextAreaElement>;
}

function createFileEvent(
  files: FileList | null
): ChangeEvent<HTMLInputElement> {
  return {
    currentTarget: { files },
  } as ChangeEvent<HTMLInputElement>;
}

describe("inputHelpers", () => {
  describe("inputValue", () => {
    it("should extract string value from input event", () => {
      const event = createInputEvent("hello");
      expect(inputValue(event)).toBe("hello");
    });

    it("should handle empty string", () => {
      const event = createInputEvent("");
      expect(inputValue(event)).toBe("");
    });
  });

  describe("inputChecked", () => {
    it("should extract checked=true from checkbox event", () => {
      const event = createCheckboxEvent(true);
      expect(inputChecked(event)).toBe(true);
    });

    it("should extract checked=false from checkbox event", () => {
      const event = createCheckboxEvent(false);
      expect(inputChecked(event)).toBe(false);
    });
  });

  describe("inputNumber", () => {
    it("should convert string to number", () => {
      const event = createInputEvent("42");
      expect(inputNumber(event)).toBe(42);
    });

    it("should handle decimal numbers", () => {
      const event = createInputEvent("3.14");
      expect(inputNumber(event)).toBe(3.14);
    });

    it("should return NaN for invalid input", () => {
      const event = createInputEvent("not a number");
      expect(inputNumber(event)).toBeNaN();
    });
  });

  describe("inputInt", () => {
    it("should parse integer from string", () => {
      const event = createInputEvent("42");
      expect(inputInt(event)).toBe(42);
    });

    it("should truncate decimal numbers", () => {
      const event = createInputEvent("3.99");
      expect(inputInt(event)).toBe(3);
    });

    it("should return NaN for invalid input", () => {
      const event = createInputEvent("abc");
      expect(inputInt(event)).toBeNaN();
    });
  });

  describe("inputFloat", () => {
    it("should parse float from string", () => {
      const event = createInputEvent("3.14159");
      expect(inputFloat(event)).toBeCloseTo(3.14159);
    });

    it("should handle integer strings", () => {
      const event = createInputEvent("42");
      expect(inputFloat(event)).toBe(42);
    });
  });

  describe("selectValue", () => {
    it("should extract value from select event", () => {
      const event = createSelectEvent("option2");
      expect(selectValue(event)).toBe("option2");
    });
  });

  describe("textareaValue", () => {
    it("should extract value from textarea event", () => {
      const event = createTextareaEvent("multiline\ntext");
      expect(textareaValue(event)).toBe("multiline\ntext");
    });
  });

  describe("inputFiles", () => {
    it("should return null when no files selected", () => {
      const event = createFileEvent(null);
      expect(inputFiles(event)).toBeNull();
    });

    it("should return FileList when files are selected", () => {
      const mockFileList = {
        length: 2,
        item: () => null,
        [Symbol.iterator]: function* () {
          yield null;
        },
      } as unknown as FileList;
      const event = createFileEvent(mockFileList);
      expect(inputFiles(event)).toBe(mockFileList);
    });
  });

  describe("inputFile", () => {
    it("should return undefined when no files selected", () => {
      const event = createFileEvent(null);
      expect(inputFile(event)).toBeUndefined();
    });

    it("should return first file when files are selected", () => {
      const mockFile = new File(["content"], "test.txt");
      const mockFileList = {
        0: mockFile,
        length: 1,
        item: (i: number) => (i === 0 ? mockFile : null),
        [Symbol.iterator]: function* () {
          yield mockFile;
        },
      } as unknown as FileList;
      const event = createFileEvent(mockFileList);
      expect(inputFile(event)).toBe(mockFile);
    });
  });
});

