import express from "express";
import {sessions, queueEntries, getNextQueueEntryId,} from "../data/store.js";
import {hasValidStudentName, hasValidQuestion,} from "../utils/queueValidator.js";

const router = express.Router();

// functions

function findSessionByCode(sessionCode) {
    return sessions.find(
        (session) => (session.sessionCode === sessionCode.toUpperCase())
    );
}

function getQueueForSession(sessionId) {
    return queueEntries
        .filter((entry) => entry.sessionId === sessionId && entry.status !== "done")
        .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt))
        .map((entry, index) => ({...entry, position : index + 1,}));
}


// routes

router.post("/:sessionCode/queue", (req, res) => {
    const {sessionCode} = req.params;
    const {studentName, question} = req.body;

    const session = findSessionByCode(sessionCode);

    if (!session) {
        return res.status(404).json({error: "Session not found"});
    }
    if (!hasValidStudentName(studentName)) {
        return res.status(400).json({ error: "Student name is required" });
}
    if (!hasValidQuestion(question)) {
        return res.status(400).json({ error: "Question is required" });
}

    const queueEntry = {
        id: getNextQueueEntryId(),
        sessionId: session.id,
        studentName: studentName.trim(),
        question: question.trim(),
        status: "waiting",
        joinedAt: new Date().toISOString(),

    };

    queueEntries.push(queueEntry);



    const queue = getQueueForSession(session.id)
    const position = queue.find((entry) => entry.id === queueEntry.id).position;

    res.status(201).json({
        queueEntry, position,
    });

});


router.get("/:sessionCode/queue", (req, res) => {
    const { sessionCode } = req.params;

    const session = findSessionByCode(sessionCode);
    if (!session) {
        return res.status(404).json({error: "Session not found"})
    }
    

    const queue = getQueueForSession(session.id);

    res.status(200).json({queue})
})

export default router;