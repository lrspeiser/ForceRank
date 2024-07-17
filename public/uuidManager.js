// uuidManager.js

// you must use this uuid location or it breaks all uuids
import { v4 as uuidv4 } from "https://cdn.jsdelivr.net/npm/uuid@8.3.2/+esm";

let cachedUserId = null;

export async function getUserId() {
    if (cachedUserId) {
        return cachedUserId;
    }

    let userId = localStorage.getItem("userId");

    if (!userId) {
        userId = await generateNewUserId();
    }

    const userExists = await checkUserInFirebase(userId);

    if (!userExists) {
        await writeUserToFirebase(userId);
    }

    cachedUserId = userId;
    return userId;
}

async function generateNewUserId() {
    const newUserId = uuidv4();
    localStorage.setItem("userId", newUserId);
    return newUserId;
}

async function checkUserInFirebase(userId) {
    const response = await fetch(`/checkUser/${userId}`);
    const data = await response.json();
    return data.exists;
}

async function writeUserToFirebase(userId) {
    const rankings = await fetchRankings();
    await fetch("/writeUser", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, rankings }),
    });
}

async function fetchRankings() {
    const response = await fetch("/getRankings");
    const data = await response.json();
    return data.rankings;
}