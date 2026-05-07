import express from "express";
import { queueEntries } from "../data/store.js";

const router = express.Router();

const VALID_STATUSES = ["waiting", "helping", "done"];

router.patch("/:entryId", (req, res) => {
  const entryId = Number(req.params.entryId);
  const { status } = req.body;

  const queueEntry = queueEntries.find((entry) => entry.id === entryId);

  if (!queueEntry) {
    return res.status(404).json({ error: "Queue entry not found" });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  queueEntry.status = status;

  res.status(200).json({ queueEntry });
});

router.delete("/:entryId", (req, res) => {
  const entryId = Number(req.params.entryId);
  const entryIndex = queueEntries.findIndex((entry) => entry.id === entryId);

  if (entryIndex === -1) {
    return res.status(404).json({ error: "Queue entry not found" });
  }

  queueEntries.splice(entryIndex, 1);

  res.status(200).json({ message: "Queue entry removed" });
});

export default router;
