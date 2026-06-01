/**
 * validation.test.js — Unit tests for src/utils/validation.js
 *
 * These are pure-function tests: no network, no database, no mocking.
 * They provide direct coverage of the validation utility layer.
 */

import {
  validateUuid,
  validateRequiredTrimmedString,
  getTrimmedString
} from "../utils/validation.js";

// ── validateUuid ─────────────────────────────────────────────────────────────

describe("validateUuid", () => {
  const VALID_V4  = "550e8400-e29b-41d4-a716-446655440000";
  const VALID_V1  = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

  test("returns null for a valid UUID v4", () => {
    expect(validateUuid(VALID_V4, "id")).toBeNull();
  });

  test("returns null for a valid UUID v1", () => {
    expect(validateUuid(VALID_V1, "id")).toBeNull();
  });

  test("returns error message for a non-UUID string", () => {
    expect(validateUuid("not-a-uuid", "id")).toMatch(/must be a valid UUID/);
  });

  test("error message includes the field name", () => {
    const msg = validateUuid("bad", "sessionId");
    expect(msg).toMatch(/sessionId/);
  });

  test("returns error for empty string", () => {
    expect(validateUuid("", "id")).toMatch(/must be a valid UUID/);
  });

  test("returns error for null", () => {
    expect(validateUuid(null, "id")).toMatch(/must be a valid UUID/);
  });

  test("returns error for undefined", () => {
    expect(validateUuid(undefined, "id")).toMatch(/must be a valid UUID/);
  });

  test("returns error for numeric value", () => {
    expect(validateUuid(123, "id")).toMatch(/must be a valid UUID/);
  });

  test("returns error for UUID with wrong format (missing hyphens)", () => {
    expect(validateUuid("550e8400e29b41d4a716446655440000", "id")).toMatch(/must be a valid UUID/);
  });

  test("accepts uppercase UUID", () => {
    expect(validateUuid(VALID_V4.toUpperCase(), "id")).toBeNull();
  });
});

// ── validateRequiredTrimmedString ─────────────────────────────────────────────

describe("validateRequiredTrimmedString", () => {
  test("returns null for a valid non-empty string", () => {
    expect(validateRequiredTrimmedString("hello", "name")).toBeNull();
  });

  test("returns null when string equals maxLength exactly", () => {
    expect(validateRequiredTrimmedString("abcde", "name", { maxLength: 5 })).toBeNull();
  });

  test("returns error when string is empty", () => {
    expect(validateRequiredTrimmedString("", "name")).toMatch(/required/);
  });

  test("returns error when string is only whitespace", () => {
    expect(validateRequiredTrimmedString("   ", "name")).toMatch(/required/);
  });

  test("error message includes field name for missing value", () => {
    const msg = validateRequiredTrimmedString("", "question");
    expect(msg).toMatch(/question/);
  });

  test("returns error when value is not a string (number)", () => {
    expect(validateRequiredTrimmedString(42, "name")).toMatch(/must be a string/);
  });

  test("returns error when value is not a string (null)", () => {
    expect(validateRequiredTrimmedString(null, "name")).toMatch(/must be a string/);
  });

  test("returns error when value is not a string (undefined)", () => {
    expect(validateRequiredTrimmedString(undefined, "name")).toMatch(/must be a string/);
  });

  test("returns error when value is not a string (array)", () => {
    expect(validateRequiredTrimmedString([], "name")).toMatch(/must be a string/);
  });

  test("returns error when trimmed string exceeds maxLength", () => {
    const long = "a".repeat(256);
    expect(validateRequiredTrimmedString(long, "name", { maxLength: 255 })).toMatch(/at most 255/);
  });

  test("error message includes field name for maxLength violation", () => {
    const msg = validateRequiredTrimmedString("a".repeat(10), "title", { maxLength: 5 });
    expect(msg).toMatch(/title/);
  });

  test("returns null when no maxLength option provided and string is long", () => {
    const long = "a".repeat(10000);
    expect(validateRequiredTrimmedString(long, "text")).toBeNull();
  });

  test("trims before checking required (whitespace-only fails)", () => {
    expect(validateRequiredTrimmedString("\t\n  ", "field")).toMatch(/required/);
  });

  test("trims before checking maxLength", () => {
    // "  hi  " trims to "hi" (2 chars) — passes maxLength: 5
    expect(validateRequiredTrimmedString("  hi  ", "name", { maxLength: 5 })).toBeNull();
  });
});

// ── getTrimmedString ──────────────────────────────────────────────────────────

describe("getTrimmedString", () => {
  test("trims leading and trailing whitespace", () => {
    expect(getTrimmedString("  hello  ")).toBe("hello");
  });

  test("returns empty string for whitespace-only input", () => {
    expect(getTrimmedString("   ")).toBe("");
  });

  test("returns non-string values as-is (null)", () => {
    expect(getTrimmedString(null)).toBeNull();
  });

  test("returns non-string values as-is (undefined)", () => {
    expect(getTrimmedString(undefined)).toBeUndefined();
  });

  test("returns non-string values as-is (number)", () => {
    expect(getTrimmedString(42)).toBe(42);
  });

  test("returns empty string unchanged", () => {
    expect(getTrimmedString("")).toBe("");
  });

  test("trims internal newlines at edges only", () => {
    expect(getTrimmedString("\nhello\n")).toBe("hello");
  });
});
