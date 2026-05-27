import "./loadEnv.js";
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    message: "Server is running"
  });
});

app.use("/api", apiRoutes);

export default app;
