import {
  isValidQueueEntry,
  hasValidStudentName,
  hasValidQuestion,
} from "./queueValidator.js";

test("student name and question are valid", () => {
  expect(isValidQueueEntry("Student1", "Question1")).toBeTruthy();
});

test("empty student name is NOT valid", () => {
  expect(isValidQueueEntry("", "Question2")).toBeFalsy();
});

test("blank student name is NOT valid", () => {
  expect(isValidQueueEntry("   ", "Question3")).toBeFalsy();
});

test("empty question is NOT valid", () => {
  expect(isValidQueueEntry("Student2", "")).toBeFalsy();
});

test("blank question is NOT valid", () => {
  expect(isValidQueueEntry("Student3", "   ")).toBeFalsy();
});

test("non-string student name is NOT valid", () => {
  expect(hasValidStudentName(null)).toBeFalsy();
});

test("non-string question is NOT valid", () => {
  expect(hasValidQuestion(null)).toBeFalsy();
});
