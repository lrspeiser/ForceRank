const socket = io();

// Select various elements from the HTML
const startDiv = document.getElementById("start");
const createGameDiv = document.getElementById("createGame");
const joinGameDiv = document.getElementById("joinGame");
const waitingRoomDiv = document.getElementById("waitingRoom");
const waitingForVotesDiv = document.getElementById("waitingForVotes");
const gameDiv = document.getElementById("game");
const resultDiv = document.getElementById("result");

const createGameButton = document.getElementById("createGameButton");
const joinGameButton = document.getElementById("joinGameButton");
const submitNamesButton = document.getElementById("submitNamesButton");
const joinGameSubmitButton = document.getElementById("joinGameSubmitButton");
const startGameButton = document.getElementById("startGameButton");

const namesInput = document.getElementById("namesInput");
const gameCodeInput = document.getElementById("gameCodeInput");
const waitingRoomGameCode = document.getElementById("waitingRoomGameCode");
const playersList = document.getElementById("playersList");

const topLabel = document.getElementById("topLabel");
const bottomLabel = document.getElementById("bottomLabel");
const sortableList = document.getElementById("sortable");
const lockButton = document.getElementById("lockButton");

const resultText = document.getElementById("resultText");
const finalResultsList = document.getElementById("finalResults");
const nextButton = document.getElementById("nextButton");

const lockCount = document.getElementById("lockCount");
const waitingLockCount = document.getElementById("waitingLockCount");
const invitationText = document.getElementById("invitationText");
const waitingVotersText = document.getElementById("waitingVotersText");
const waitingVotesText = document.getElementById("waitingVotesText");

// Initialize state variables
let currentRankingIndex = 0;
let rankings = [];
let userId = localStorage.getItem("userId");

// Function to generate a random game code
const generateGameCode = () =>
    Math.random().toString(36).substring(2, 7).toUpperCase();

const storedGameCode = localStorage.getItem("gameCode");

if (storedGameCode && userId) {
    console.log(
        `[script.js] Found stored game code: ${storedGameCode}, UUID: ${userId}`,
    );
    // Emit event to check if the game exists
    socket.emit("checkGameExists", { gameCode: storedGameCode, userId });
} else {
    console.log("[script.js] No stored game code found. Showing start screen.");
    startDiv.style.display = "flex";
}

// Listen for the "gameExists" event from the server
socket.on(
    "gameExists",
    ({ exists, userExists, gameCode, userId, state, names, playersCount }) => {
        const isCreator = localStorage.getItem("isCreator") === "true";
        console.log(
            `[script.js/socket.on(gameExists)] Game exists: ${exists}, User exists: ${userExists}, Game code: ${gameCode}, User ID: ${userId}, State: ${state}, Names: ${names}, Players count: ${playersCount}`,
        );
        console.log(
            `[script.js/socket.on(gameExists)] User is creator: ${isCreator}`,
        );
        console.log(
            `[script.js/socket.on(gameExists)] Start button will ${exists && isCreator ? "be shown" : "not be shown"}`,
        );

        if (startGameButton) {
            startGameButton.style.display =
                exists && isCreator ? "block" : "none";
        }

        console.log("[script.js/socket.on(gameExists)] Hiding start screen");
        startDiv.style.display = "none";

        if (exists && userExists && state !== "waiting") {
            console.log(
                "[script.js/socket.on(gameExists)] User is already in an ongoing game. Directly entering game.",
            );
            createGameDiv.style.display = "none";
            joinGameDiv.style.display = "none";
            waitingRoomDiv.style.display = "none";
            gameDiv.style.display = "flex";
            socket.emit("rejoinGame", { gameCode, userId });
        } else if (exists && userExists && state === "waiting") {
            console.log(
                "[script.js/socket.on(gameExists)] User is in waiting room.",
            );
            waitingRoomDiv.style.display = "flex";
            waitingRoomGameCode.textContent = gameCode;
            updatePlayersList(names, playersCount);
            console.log(
                `[script.js/socket.on(gameExists)] Updated waiting room with game code: ${gameCode}, names: ${names}, players count: ${playersCount}`,
            );
        } else if (!exists) {
            localStorage.removeItem("isCreator");
            localStorage.removeItem("gameCode");
            console.log(
                "[script.js/socket.on(gameExists)] Game does not exist. Showing start screen and removing creator flag and game code",
            );
            startDiv.style.display = "flex";
        }
    },
);

createGameButton.addEventListener("click", () => {
    console.log(
        "[script.js/createGameButton.click] Hiding start screen and showing create game screen",
    );
    startDiv.style.display = "none";
    createGameDiv.style.display = "flex";
});

submitNamesButton.addEventListener("click", () => {
    // Split names input by commas or newlines, trim whitespace, and filter out empty names
    const names = namesInput.value
        .split(/[\n,]+/)
        .map((name) => name.trim())
        .filter((name) => name);
    if (names.length > 0) {
        const gameCode = generateGameCode();
        userId = uuid.v4();
        localStorage.setItem("gameCode", gameCode);
        localStorage.setItem("userId", userId);
        localStorage.setItem("isCreator", "true");
        console.log(
            `[script.js/submitNamesButton.click] Game code: ${gameCode}, Names: ${names}, UUID: ${userId}, Creator: true`,
        );
        socket.emit("createGame", { gameCode, names, userId });
        console.log(
            "[script.js/submitNamesButton.click] Hiding create game screen and showing waiting room",
        );
        createGameDiv.style.display = "none";
        waitingRoomDiv.style.display = "flex";
        if (waitingRoomGameCode) {
            waitingRoomGameCode.textContent = gameCode;
        }
        const invitation = `Hey player, help me Force Rank ${names.join(
            ", ",
        )}. Go to http://forcerank.replit.app/?gameid=${gameCode}`;
        invitationText.value = invitation;
        invitationText.focus();
        invitationText.select();
        console.log(
            `[script.js/submitNamesButton.click] Invitation text: ${invitation}`,
        );
    } else {
        console.log("[script.js/submitNamesButton.click] Names input is empty");
    }
});

joinGameButton.addEventListener("click", () => {
    console.log(
        "[script.js/joinGameButton.click] Hiding start screen and showing join game screen",
    );
    startDiv.style.display = "none";
    joinGameDiv.style.display = "flex";
});

joinGameSubmitButton.addEventListener("click", () => {
    const gameCode = gameCodeInput.value.trim();
    userId = uuid.v4();

    if (gameCode) {
        console.log(
            `[script.js/joinGameSubmitButton.click] Game code: ${gameCode}, UUID: ${userId}, Creator: false`,
        );
        socket.emit("joinGame", { gameCode, userId });
        localStorage.setItem("gameCode", gameCode);
        localStorage.setItem("userId", userId);
        localStorage.removeItem("isCreator");
        console.log(
            "[script.js/joinGameSubmitButton.click] Removed creator flag from local storage",
        );
        console.log(
            "[script.js/joinGameSubmitButton.click] Hiding join game screen and showing waiting room",
        );
        joinGameDiv.style.display = "none";
        waitingRoomDiv.style.display = "flex";
        if (waitingRoomGameCode) {
            waitingRoomGameCode.textContent = gameCode;
        }
        console.log(
            `[script.js/joinGameSubmitButton.click] Game code: ${gameCode}`,
        );
    } else {
        console.log(
            "[script.js/joinGameSubmitButton.click] Game code input is empty",
        );
    }
});

// Initialize Sortable
new Sortable(sortableList, {
    animation: 150,
    ghostClass: "dragging",
    onEnd: () => {
        const updatedRankings = Array.from(sortableList.children).map(
            (li, index) => ({
                name: li.textContent,
                rank: index + 1,
            }),
        );
        console.log(
            `[script.js] Updated Rankings: ${JSON.stringify(updatedRankings)}`,
        );

        const gameCode = localStorage.getItem("gameCode");
        if (gameCode) {
            socket.emit("updateRankings", {
                gameCode,
                userId,
                rankings: updatedRankings,
            });
        } else {
            console.log(
                "[script.js] Error: Game code is null during ranking update",
            );
        }
    },
});

// Listen for the "gameJoined" event from the server
socket.on("gameJoined", (data) => {
    console.log(
        `[script.js/socket.on('gameJoined')] Joined game: ${data.gameCode}, Names: ${data.names}, Players count: ${data.playersCount}`,
    );
    updatePlayersList(data.names, data.playersCount);
    const isCreator = localStorage.getItem("isCreator") === "true";
    console.log(
        `[script.js/socket.on('gameJoined')] User is creator: ${isCreator}`,
    );
    if (startGameButton) {
        startGameButton.style.display = isCreator ? "block" : "none";
    }
    console.log(
        `[script.js/socket.on('gameJoined')] Start button will ${
            isCreator ? "be shown" : "not be shown"
        }`,
    );
    if (waitingRoomGameCode) {
        waitingRoomGameCode.textContent = data.gameCode;
    }
    const invitation = `Hey player, help me Force Rank ${data.names.join(", ")}. Go to http://forcerank.replit.app/?gameid=${data.gameCode}`;
    invitationText.value = invitation;
    invitationText.focus();
    invitationText.select();
    console.log("[script.js/socket.on('gameJoined')] Showing waiting room");
    waitingRoomDiv.style.display = "flex";
    // Log local storage details
    console.log(`[script.js/socket.on('gameJoined')] Local Storage Data:`);
    console.log(
        `[script.js/socket.on('gameJoined')] gameCode: ${localStorage.getItem("gameCode")}`,
    );
    console.log(
        `[script.js/socket.on('gameJoined')] userId: ${localStorage.getItem("userId")}`,
    );
    console.log(
        `[script.js/socket.on('gameJoined')] isCreator: ${localStorage.getItem("isCreator")}`,
    );
});

startGameButton.addEventListener("click", () => {
    const gameCode = localStorage.getItem("gameCode");
    if (gameCode) {
        console.log(
            `[script.js/startGameButton.click] Attempting to start game for game code: ${gameCode}`,
        );
        socket.emit("startGame", { gameCode });
    } else {
        console.log(
            "[script.js/startGameButton.click] Error: Game code is null",
        );
    }
});

// Listen for the "startGame" event from the server
socket.on("startGame", (data) => {
    console.log(
        `[script.js/socket.on('startGame')] Starting game for game code: ${data.gameCode}`,
    );
    console.log(
        "[script.js/socket.on('startGame')] Hiding waiting room and showing game screen",
    );
    console.log(
        `[script.js/socket.on('startGame')] Top criteria: ${data.rankingCriteria[1]}, Bottom criteria: ${data.rankingCriteria[2]}`,
    );
    console.log(
        `[script.js/socket.on('startGame')] Names to be ranked: ${data.names.join(", ")}`,
    );

    waitingRoomDiv.style.display = "none";
    gameDiv.style.display = "flex";

    currentRankingIndex = 0;
    rankings = data.names.map((name, index) => ({
        name,
        rank: index + 1,
    }));

    topLabel.textContent = data.rankingCriteria[1];
    bottomLabel.textContent = data.rankingCriteria[2];

    sortableList.innerHTML = "";
    rankings.forEach(({ name }) => {
        const li = document.createElement("li");
        li.textContent = name;
        sortableList.appendChild(li);
    });

    new Sortable(sortableList, {
        animation: 150,
        ghostClass: "dragging",
        onEnd: () => {
            const updatedRankings = Array.from(sortableList.children).map(
                (li, index) => ({
                    name: li.textContent,
                    rank: index + 1,
                }),
            );
            console.log(
                `[script.js] Updated Rankings: ${JSON.stringify(updatedRankings)}`,
            );

            const gameCode = localStorage.getItem("gameCode");
            if (gameCode) {
                socket.emit("updateRankings", {
                    gameCode,
                    userId,
                    rankings: updatedRankings,
                });
            } else {
                console.log(
                    "[script.js] Error: Game code is null during ranking update",
                );
            }
        },
    });

    const gameCode = localStorage.getItem("gameCode");
    if (gameCode) {
        socket.emit("updateRankings", { gameCode, userId, rankings });
        if (waitingVotersText) {
            waitingVotersText.textContent = `Waiting on ${data.playersCount} voters`;
        }
    } else {
        console.log(
            "[script.js] Error: Game code is null during initial ranking update",
        );
    }
});

lockButton.addEventListener("click", () => {
    console.log("[script.js/lockButton.click] Click event triggered");
    const gameCode = localStorage.getItem("gameCode");
    console.log(
        `[script.js/lockButton.click] Retrieved game code from local storage: ${gameCode}`,
    );
    const userId = localStorage.getItem("userId");
    console.log(
        `[script.js/lockButton.click] Retrieved user ID from local storage: ${userId}`,
    );

    console.log(
        `[script.js/lockButton.click] Locking in rankings for game code: ${gameCode}, User ID: ${userId}`,
    );

    if (gameCode && userId) {
        console.log(
            `[script.js/lockButton.click] Emitting 'lockRankings' event`,
        );
        socket.emit("lockRankings", { gameCode, userId, rankings });
    } else {
        console.log(
            "[script.js/lockButton.click] Error: Game code or user ID is null",
        );
    }
});

// Listen for the "displayFinalResults" event from the server
socket.on("displayFinalResults", (data) => {
    console.log(
        `[script.js/socket.on('displayFinalResults')] Displaying final results for game code: ${data.gameCode}`,
    );
    console.log(
        `[script.js/socket.on('displayFinalResults')] Final results: ${JSON.stringify(data.finalResults)}`,
    );
    console.log(
        `[script.js/socket.on('displayFinalResults')] Ranking criteria: ${JSON.stringify(data.rankingCriteria)}`,
    );

    resultDiv.style.display = "flex";
    gameDiv.style.display = "none";

    finalResultsList.innerHTML = "";
    data.finalResults.forEach((result) => {
        const li = document.createElement("li");
        const userRank = rankings.find(
            (ranking) => ranking.name === result.name,
        )?.rank;
        li.textContent = `${result.name} - Group Rank: ${result.rank}, Your Rank: ${userRank}`;
        finalResultsList.appendChild(li);
    });

    nextButton.style.display =
        localStorage.getItem("isCreator") === "true" ? "block" : "none";
    console.log(
        `[script.js/socket.on('displayFinalResults')] Updated final results display`,
    );
});

// Listen for the "showWaitingRoom" event from the server
socket.on("showWaitingRoom", (data) => {
    console.log(
        "[script.js/socket.on('showWaitingRoom')] 'showWaitingRoom' event received",
    );
    console.log(
        `[script.js/socket.on('showWaitingRoom')] Showing waiting room for game code: ${data.gameCode}`,
    );
    console.log(
        `[script.js/socket.on('showWaitingRoom')] Current lock count: ${data.lockedCount}/${data.playersCount}`,
    );
    console.log(
        "[script.js/socket.on('showWaitingRoom')] Setting waiting room div display to 'flex'",
    );
    waitingForVotesDiv.style.display = "flex";
    gameDiv.style.display = "none";
    if (waitingVotesText) {
        waitingVotesText.textContent = `Waiting on ${
            data.playersCount - data.lockedCount
        } voters`;
    }
    console.log(
        "[script.js/socket.on('showWaitingRoom')] Setting game div display to 'none'",
    );
    console.log(
        `[script.js/socket.on('showWaitingRoom')] Updating players list with names: ${data.names} and players count: ${data.playersCount}`,
    );
    updatePlayersList(data.names, data.playersCount);
});

// Listen for the "showResults" event from the server
socket.on("showResults", (data) => {
    console.log("[script.js/socket.on('showResults')] Showing results");
    console.log(
        "[script.js/socket.on('showResults')] Hiding game screen and showing result screen",
    );

    resultDiv.style.display = "flex";
    gameDiv.style.display = "none";

    const topCriteria = data.rankingCriteria ? data.rankingCriteria[1] : "Top";
    const bottomCriteria = data.rankingCriteria
        ? data.rankingCriteria[2]
        : "Bottom";

    topLabel.textContent = topCriteria;
    bottomLabel.textContent = bottomCriteria;

    finalResultsList.innerHTML = "";
    data.finalResults.forEach((result) => {
        const li = document.createElement("li");
        li.textContent = `${result.name} (${result.rank})`;
        finalResultsList.appendChild(li);
    });
    nextButton.style.display =
        localStorage.getItem("isCreator") === "true" ? "block" : "none";
    console.log(
        "[script.js/socket.on('showResults')] Result text content updated",
    );
});

nextButton.addEventListener("click", () => {
    const gameCode = waitingRoomGameCode
        ? waitingRoomGameCode.textContent.trim()
        : null;
    if (gameCode) {
        console.log(
            `[script.js/nextButton.click] Moving to next ranking for game code: ${gameCode}`,
        );
        socket.emit("nextRanking", { gameCode });
    } else {
        console.log("[script.js/nextButton.click] Error: Game code is null");
    }
});

// Listen for the "refreshRanking" event from the server
socket.on("refreshRanking", (data) => {
    console.log(
        "[script.js/socket.on('refreshRanking')] Refreshing rankings for new round",
    );
    console.log(
        "[script.js/socket.on('refreshRanking')] Hiding result screen and showing game screen",
    );

    gameDiv.style.display = "flex";
    resultDiv.style.display = "none";

    const topCriteria = data.rankingCriteria[1];
    const bottomCriteria = data.rankingCriteria[2];

    topLabel.textContent = topCriteria;
    bottomLabel.textContent = bottomCriteria;

    sortableList.innerHTML = "";
    data.names.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        sortableList.appendChild(li);
    });
    console.log(
        `[script.js/socket.on('refreshRanking')] Updated sortable list with names: ${data.names}`,
    );
});

// Listen for the "updateLockCount" event from the server
socket.on("updateLockCount", (data) => {
    console.log(
        `[script.js/socket.on('updateLockCount')] Lock count updated: ${data.lockedCount}/${data.playersCount}`,
    );
    if (lockCount) {
        lockCount.textContent = `${data.lockedCount}/${data.playersCount} players locked in`;
        console.log(
            `[script.js/socket.on('updateLockCount')] Lock count text: ${lockCount.textContent}`,
        );
    }
    if (waitingLockCount) {
        waitingLockCount.textContent = `${data.lockedCount}/${data.playersCount} players locked in`;
        console.log(
            `[script.js/socket.on('updateLockCount')] Waiting lock count text: ${waitingLockCount.textContent}`,
        );
    }
    if (waitingVotesText) {
        waitingVotesText.textContent = `Waiting on ${
            data.playersCount - data.lockedCount
        } voters`;
    }
    if (waitingVotersText) {
        waitingVotersText.textContent = `Waiting on ${
            data.playersCount - data.lockedCount
        } voters`;
    }
});

// Update the players list in the waiting room
function updatePlayersList(names, playerCount) {
    console.log(
        `[script.js/updatePlayersList] Updating players list with ${playerCount} players`,
    );
    playersList.innerHTML = "";
    names.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        playersList.appendChild(li);
    });
    const playerCountElement = document.getElementById("playerCount");
    if (playerCountElement) {
        playerCountElement.textContent = `${playerCount} Players`;
        console.log(
            `[script.js/updatePlayersList] Player count text: ${playerCountElement.textContent}`,
        );
    }
}

// Handle page load event
window.addEventListener("load", () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameCode = urlParams.get("gameid");

    if (gameCode) {
        console.log(`[script.js] Game code from URL: ${gameCode}`);
        userId = localStorage.getItem("userId");
        if (!userId) {
            userId = uuid.v4();
            localStorage.setItem("userId", userId);
        }
        localStorage.setItem("gameCode", gameCode);
        localStorage.removeItem("isCreator");
        console.log("[script.js] Removed creator flag from local storage");
        socket.emit("joinGame", { gameCode, userId });
        console.log(
            "[script.js] Hiding start, create, and join screens and showing waiting room",
        );
        startDiv.style.display = "none";
        createGameDiv.style.display = "none";
        joinGameDiv.style.display = "none";
        waitingRoomDiv.style.display = "flex";
        if (waitingRoomGameCode) {
            waitingRoomGameCode.textContent = gameCode;
        }
    } else {
        console.log("[script.js] No game code from URL. Showing start screen.");
        startDiv.style.display = "flex";
    }
});
