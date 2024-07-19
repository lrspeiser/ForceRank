// uuidManager.js

// you must use this uuid location or it breaks all uuids
import { v4 as uuidv4 } from "https://cdn.jsdelivr.net/npm/uuid@8.3.2/+esm";

let cachedUserId = null;
let isCreator = false;


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

    // Add this block to initialize the user on the server
    try {
        const response = await fetch(`/initUser/${userId}`);
        const data = await response.json();
        if (!data.success) {
            console.error(`[uuidManager/getUserId] Failed to initialize user: ${data.error}`);
        } else {
            console.log(`[uuidManager/getUserId] User initialized successfully: ${userId}`);
        }
    } catch (error) {
        console.error(`[uuidManager/getUserId] Error initializing user: ${error}`);
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

export function setCreatorStatus(status) {
    isCreator = status;
    localStorage.setItem("isCreator", status.toString());
}

export function getCreatorStatus() {
    if (isCreator === undefined) {
        isCreator = localStorage.getItem("isCreator") === "true";
    }
    return isCreator;
}