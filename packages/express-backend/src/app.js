import "./loadEnv.js";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";
import guestRoutes from "./routes/guest.js";

const app = express();

// In production, restrict CORS to the deployed frontend origin(s).
// Set CORS_ORIGIN="https://helpq.netlify.app" (or comma-separated list) in env.
// In development / tests, allow all origins.
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : "*";

app.use(
  cors({
    origin: corsOrigins === "*" ? "*" : (origin, cb) => {
      // Allow server-to-server calls (no origin header) and listed origins
      if (!origin || corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Server is running",
    features: {
      scheduleAutoSync: true,
      scheduleSyncStatus: true
    }
  });
});

app.use("/api", apiRoutes);
app.use("/api/guest", guestRoutes);

export default app;
