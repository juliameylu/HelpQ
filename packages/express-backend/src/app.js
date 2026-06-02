import "./loadEnv.js";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";
import guestRoutes from "./routes/guest.js";

const app = express();

// In production, restrict CORS to the deployed frontend origin(s).
// Set CORS_ORIGIN to your Azure Static Web App URL (or comma-separated list).
// In development / tests, default to local frontend origins when CORS_ORIGIN is unset.
const configuredCorsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  : [];
const corsOrigins = configuredCorsOrigins.length
  ? configuredCorsOrigins
  : process.env.NODE_ENV === "production"
    ? []
    : [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
      ];

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow server-to-server calls (no origin header) and listed origins.
      if (!origin || corsOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
  })
);

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    name: "HelpQ API",
    status: "ok",
    health: "/health"
  });
});

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
