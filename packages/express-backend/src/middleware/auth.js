import { supabase } from "../config/supabase.js";

export const requireAuth = async (req, res, next) => {
  try {
    const authorization = req.get("authorization") || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    const token = match[1];
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = data.user;
    next();
  } catch (error) {
    console.error("Error verifying auth token:", error);
    res.status(500).json({ error: "Failed to verify auth token" });
  }
};
