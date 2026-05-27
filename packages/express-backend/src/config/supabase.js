import { createClient } from "@supabase/supabase-js";
import ws from "ws";

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in .env"
  );
}

// Create client with anon key (for client-side operations)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Node.js < 22 needs explicit websocket transport for realtime-js.
  // This prevents: "Node.js 20 detected without native WebSocket support."
  realtime: { transport: ws }
});

// Create admin client with service role key (for server-side operations)
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || supabaseAnonKey,
  {
    realtime: { transport: ws }
  }
);
