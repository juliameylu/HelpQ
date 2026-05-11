export const sessions = [];
export const queueEntries = [];

export let nextSessionId = 1;
export let nextQueueEntryId = 1;

export function getNextSessionId() {
    return nextSessionId++;
};

export function getNextQueueEntryId() {
    return nextQueueEntryId++;
};

export function resetStore() {
    sessions.length = 0;
    queueEntries.length = 0;
    nextSessionId = 1;
    nextQueueEntryId = 1;
}
