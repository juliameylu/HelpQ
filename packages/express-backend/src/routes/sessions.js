import express from "express";
import {sessions, getNextSessionId} from "../data/store.js";

const router = express.Router();


// functions

function generateSessionCode() {
    let sessionId;

    do {
        sessionId = Math.random().toString(36).substring(2,8).toUpperCase();
    } while (
        sessions.some((session) => session.sessionCode === sessionId)
    );
    return sessionId;
}



// routes

router.post("/", (req, res) => {
    const session = {
        id: getNextSessionId(),
        sessionCode: generateSessionCode(),
        active: true,
        createdAt: new Date().toISOString(),
        
    };

    sessions.push(session);

    res.status(201).json({session});

})

router.get("/:sessionCode", (req, res) => {
    const {sessionCode} = req.params;

    const session = sessions.find(
        (currentSession) => currentSession.sessionCode === sessionCode.toUpperCase()
    );

    if (!session) {
        return res.status(404).json({error: "Session not found"
        });
    }

    res.status(200).json({session});

});




export default router;