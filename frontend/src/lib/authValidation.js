const MIN_PASSWORD_LENGTH = 6;

export function validatePassword(password) {
  if (!password?.trim()) {
    return "Password is required.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validatePasswordMatch(password, confirmPassword) {
  const passwordError = validatePassword(password);
  if (passwordError) {
    return passwordError;
  }
  if (password !== confirmPassword) {
    return "Passwords do not match.";
  }
  return null;
}

export {
  loginRedirectUrl,
  passwordResetRedirectUrl,
  siteUrl
} from "./authRedirect.js";
