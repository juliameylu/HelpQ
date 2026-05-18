import { supabase } from "../config/supabase.js";
import { internalServerError, unauthorizedError } from "../utils/errors.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return unauthorizedError(res, "Missing bearer token");
    }

    const token = match[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return unauthorizedError(res, "Invalid token");
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("Error verifying auth token:", error);
    return internalServerError(res, "Failed to verify auth token");
  }
};
