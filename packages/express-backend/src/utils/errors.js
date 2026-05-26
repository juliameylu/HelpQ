const sendError = (res, status, code, message, details) => {
  const payload = {
    error: {
      code,
      message
    }
  };

  if (details) {
    payload.error.details = details;
  }

  return res.status(status).json(payload);
};

export const badRequestError = (res, message, details) =>
  sendError(res, 400, "bad_request", message, details);

export const validationError = (res, details) =>
  sendError(res, 400, "validation_failed", "Validation failed", details);

export const unauthorizedError = (res, message = "Authentication required") =>
  sendError(res, 401, "unauthorized", message);

export const forbiddenError = (res, message = "Forbidden") =>
  sendError(res, 403, "forbidden", message);

export const notFoundError = (res, resource = "Resource") =>
  sendError(res, 404, "not_found", `${resource} not found`);

export const internalServerError = (
  res,
  message = "Internal server error",
  details
) => sendError(res, 500, "internal_error", message, details);
