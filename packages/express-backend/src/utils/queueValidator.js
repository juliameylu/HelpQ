export function isValidQueueEntry(studentName, question) {
  return hasValidStudentName(studentName) && hasValidQuestion(question);
}

export function hasValidStudentName(studentName) {
  return typeof studentName === "string" && studentName.trim().length > 0;
}

export function hasValidQuestion(question) {
  return typeof question === "string" && question.trim().length > 0;
}
