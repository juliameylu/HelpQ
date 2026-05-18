const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeString = (value) =>
  typeof value === "string" ? value.trim() : value;

export const validationError = (res, details) =>
  res.status(400).json({
    error: "Validation failed",
    details
  });

export const validateUuid = (value, fieldName) => {
  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    return `${fieldName} must be a valid UUID`;
  }

  return null;
};

export const validateRequiredTrimmedString = (
  value,
  fieldName,
  { maxLength } = {}
) => {
  if (typeof value !== "string") {
    return `${fieldName} must be a string`;
  }

  const trimmedValue = normalizeString(value);

  if (!trimmedValue) {
    return `${fieldName} is required`;
  }

  if (maxLength && trimmedValue.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }

  return null;
};

export const getTrimmedString = (value) => normalizeString(value);
