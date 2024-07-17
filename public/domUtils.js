// domUtils.js
import { getRankings } from './main.js';



export function hideElement(elementId) {
    console.log(
        `[domUtils.js/hideElement] Called with elementId: ${elementId}`,
    );
    const element = document.getElementById(elementId);
    console.log(`[domUtils.js/hideElement] Fetched element: ${element}`);
    if (element) {
        element.style.display = "none";
        console.log(`[domUtils.js/hideElement] Hiding element: ${elementId}`);
    } else {
        console.log(
            `[domUtils.js/hideElement] Element not found: ${elementId}`,
        );
    }
}

export function showElement(elementId) {
    console.log(
        `[domUtils.js/showElement] Called with elementId: ${elementId}`,
    );
    const element = document.getElementById(elementId);
    console.log(`[domUtils.js/showElement] Fetched element: ${element}`);
    if (element) {
        element.style.display = "block";
        console.log(`[domUtils.js/showElement] Showing element: ${elementId}`);
    } else {
        console.log(
            `[domUtils.js/showElement] Element not found: ${elementId}`,
        );
    }
}

export function updateTextContent(elementId, text) {
    console.log(
        `[domUtils.js/updateTextContent] Called with elementId: ${elementId}, text: ${text}`,
    );
    const element = document.getElementById(elementId);
    console.log(`[domUtils.js/updateTextContent] Fetched element: ${element}`);
    if (element) {
        element.textContent = text;
        console.log(
            `[domUtils.js/updateTextContent] Updating text content for element: ${elementId}, text: ${text}`,
        );
    } else {
        console.log(
            `[domUtils.js/updateTextContent] Element not found: ${elementId}`,
        );
    }
}

export function updatePlayersList(players) {
    console.log(
        `[domUtils.js/updatePlayersList] Called with players: ${JSON.stringify(players)}`,
    );
    const playersListElement = document.getElementById("playersList");
    console.log(
        `[domUtils.js/updatePlayersList] Fetched players list element: ${playersListElement}`,
    );
    if (playersListElement) {
        playersListElement.innerHTML = players
            .map((player) => `<li>${player}</li>`)
            .join("");
        console.log(
            `[domUtils.js/updatePlayersList] Updating players list with ${players.length} players`,
        );
    } else {
        console.log(
            `[domUtils.js/updatePlayersList] Players list element not found`,
        );
    }
}

