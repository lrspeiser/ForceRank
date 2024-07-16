// domUtils.js

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

// main.js

const socket = io();
console.log("[main.js] Socket initialized");

socket.on("updateLockCount", ({ lockedCount, playersCount }) => {
    console.log(
        `[main.js/socket.on('updateLockCount')] Lock count updated: ${lockedCount}/${playersCount}`,
    );
    updateLockCount(lockedCount, playersCount);

    if (lockedCount === playersCount) {
        console.log(
            `[main.js/socket.on('updateLockCount')] All players have locked in their votes. Fetching final results...`,
        );
        socket.emit("fetchFinalResults", { gameCode });
    }
});

function updateLockCount(lockedCount, playersCount) {
    console.log(
        `[main.js/updateLockCount] Called with lockedCount: ${lockedCount}, playersCount: ${playersCount}`,
    );
    updateTextContent(
        "lockCountText",
        `${lockedCount}/${playersCount} players locked in`,
    );
    console.log(`[main.js/updateLockCount] Updated lockCountText`);
    updateTextContent(
        "waitingVotesText",
        `${lockedCount}/${playersCount} votes placed`,
    );
    console.log(`[main.js/updateLockCount] Updated waitingVotesText`);
    if (lockedCount === playersCount) {
        console.log(
            `[main.js/updateLockCount] All players have locked in their votes. Displaying results...`,
        );
        showFinalResults();
    } else {
        console.log(`[main.js/updateLockCount] Waiting for all votes...`);
    }
}

function showFinalResults() {
    console.log(`[main.js/showFinalResults] Called`);
    hideElement("waitingRoom");
    showElement("result");
    console.log(`[main.js/showFinalResults] Showing final results`);
}

socket.on("displayFinalResults", ({ finalResults, rankingCriteria }) => {
    console.log(
        `[main.js/socket.on('displayFinalResults')] Displaying final results for game code: ${gameCode}`,
    );
    console.log(
        `[main.js/socket.on('displayFinalResults')] Final results: ${JSON.stringify(finalResults)}`,
    );
    console.log(
        `[main.js/socket.on('displayFinalResults')] Ranking criteria: ${JSON.stringify(rankingCriteria)}`,
    );
    updateFinalResults(finalResults, rankingCriteria);
});

function updateFinalResults(finalResults, rankingCriteria) {
    console.log(
        `[main.js/updateFinalResults] Called with finalResults: ${JSON.stringify(finalResults)}, rankingCriteria: ${JSON.stringify(rankingCriteria)}`,
    );
    const finalResultsElement = document.getElementById("finalResults");
    console.log(
        `[main.js/updateFinalResults] Fetched finalResultsElement: ${finalResultsElement}`,
    );
    if (finalResultsElement) {
        finalResultsElement.innerHTML = finalResults
            .map((result) => `<li>${result.name} - ${result.rank}</li>`)
            .join("");
        console.log(
            `[main.js/updateFinalResults] Updated final results display`,
        );
    } else {
        console.log(
            `[main.js/updateFinalResults] finalResultsElement not found`,
        );
    }

    const rankingCriteriaElement = document.getElementById("rankingCriteria");
    console.log(
        `[main.js/updateFinalResults] Fetched rankingCriteriaElement: ${rankingCriteriaElement}`,
    );
    if (rankingCriteriaElement) {
        rankingCriteriaElement.textContent = `Ranking Criteria: ${rankingCriteria.join(", ")}`;
        console.log(
            `[main.js/updateFinalResults] Updated ranking criteria display`,
        );
    } else {
        console.log(
            `[main.js/updateFinalResults] rankingCriteriaElement not found`,
        );
    }
}

socket.on(
    "showWaitingRoom",
    ({ gameCode, lockedCount, playersCount, names }) => {
        console.log(
            `[main.js/socket.on('showWaitingRoom')] Showing waiting room for game code: ${gameCode}`,
        );
        hideElement("game");
        showElement("waitingRoom");
        updatePlayersList(names);
        updateLockCount(lockedCount, playersCount);
    },
);

socket.on("startGame", ({ gameCode, names, rankingCriteria, playersCount }) => {
    console.log(
        `[main.js/socket.on('startGame')] Starting game for game code: ${gameCode}`,
    );
    hideElement("waitingRoom");
    showElement("game");
    updateTextContent("topLabel", rankingCriteria[1]);
    updateTextContent("bottomLabel", rankingCriteria[2]);
    updatePlayersList(names);
});

document.getElementById("lockButton").addEventListener("click", () => {
    console.log(`[main.js/lockButton.click] Click event triggered`);
    const gameCode = localStorage.getItem("gameCode");
    console.log(
        `[main.js/lockButton.click] Retrieved game code from local storage: ${gameCode}`,
    );
    const userId = localStorage.getItem("userId");
    console.log(
        `[main.js/lockButton.click] Retrieved user ID from local storage: ${userId}`,
    );
    const rankings = getRankings(); // Function to get the current rankings from the UI
    console.log(
        `[main.js/lockButton.click] Retrieved rankings from UI: ${JSON.stringify(rankings)}`,
    );

    socket.emit("lockRankings", { gameCode, userId, rankings });
    console.log(
        `[main.js/lockButton.click] Emitted lockRankings event with gameCode: ${gameCode}, userId: ${userId}, rankings: ${JSON.stringify(rankings)}`,
    );
});

console.log("[main.js] Script execution completed");
