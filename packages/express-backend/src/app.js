import express from "express";
import cors from "cors";

import sessionsRouter from "./routes/sessions.js"
import queueRouter from "./routes/queue.js"
import queueEntriesRouter from "./routes/queueEntries.js" 

const app = express();

app.use(cors());
app.use(express.json());

// routes

app.get("/", (req, res) => {
    res.send("Office Hours Queue API is running");
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Backend server is healthy",
    });
});


app.use("/sessions", sessionsRouter);
app.use("/sessions", queueRouter);
app.use("/queue-entries", queueEntriesRouter)

export default app;