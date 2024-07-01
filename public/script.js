const socket = io();

const startDiv = document.getElementById("start");
const createGameDiv = document.getElementById("createGame");
const joinGameDiv = document.getElementById("joinGame");
const waitingRoomDiv = document.getElementById("waitingRoom");
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

let currentRankingIndex = 0;
let rankings = [];
let userId = localStorage.getItem("userId");

const generateGameCode = () => Math.random().toString(36).substring(2, 7).toUpperCase();

const storedGameCode = localStorage.getItem("gameCode");

if (storedGameCode && userId) {
    console.log(`[script.js] Found stored game code: ${storedGameCode}, UUID: ${userId}`);
    socket.emit("checkGameExists", { gameCode: storedGameCode, userId });
} else {
    startDiv.style.display = "flex";
}

socket.on("gameExists", ({ exists }) => {
    const isCreator = localStorage.getItem("isCreator") === "true";
    console.log(`[script.js/socket.on(gameExists)] User is creator: ${isCreator}`);
    console.log(`[script.js/socket.on(gameExists)] Start button will ${exists && isCreator ? "be shown" : "not be shown"}`);
    startGameButton.style.display = exists && isCreator ? "block" : "none";
    if (!exists) {
        localStorage.removeItem("isCreator");
        console.log("[script.js/socket.on(gameExists)] Game does not exist. Creator flag removed.");
        startDiv.style.display = "flex";
    }
});

createGameButton.addEventListener("click", () => {
    startDiv.style.display = "none";
    createGameDiv.style.display = "flex";
});

submitNamesButton.addEventListener("click", () => {
    const names = namesInput.value.split(/[\n,]+/).map((name) => name.trim()).filter((name) => name);
    if (names.length > 0) {
        const gameCode = generateGameCode();
        userId = uuid.v4();
        localStorage.setItem("gameCode", gameCode);
        localStorage.setItem("userId", userId);
        localStorage.setItem("isCreator", "true");
        console.log(`[script.js/submitNamesButton.click] Game code: ${gameCode}, Names: ${names}, UUID: ${userId}, Creator: true`);
        socket.emit("createGame", { gameCode, names, userId });
        createGameDiv.style.display = "none";
        waitingRoomDiv.style.display = "flex";
        waitingRoomGameCode.textContent = gameCode;
    } else {
        console.log("[script.js/submitNamesButton.click] Names input is empty");
    }
});

joinGameButton.addEventListener("click", () => {
    startDiv.style.display = "none";
    joinGameDiv.style.display = "flex";
});

joinGameSubmitButton.addEventListener("click", () => {
    const gameCode = gameCodeInput.value.trim();
    userId = uuid.v4();

    if (gameCode) {
        console.log(`[script.js/joinGameSubmitButton.click] Game code: ${gameCode}, UUID: ${userId}, Creator: false`);
        socket.emit("joinGame", { gameCode, userId });
        localStorage.setItem("gameCode", gameCode);
        localStorage.setItem("userId", userId);
        localStorage.removeItem("isCreator");
        console.log("[script.js/joinGameSubmitButton.click] Creator flag removed");
        joinGameDiv.style.display = "none";
        waitingRoomDiv.style.display = "flex";
        waitingRoomGameCode.textContent = gameCode;
    } else {
        console.log("[script.js/joinGameSubmitButton.click] Game code input is empty");
    }
});

socket.on("gameJoined", (data) => {
    console.log(`[script.js/socket.on('gameJoined')] Joined game: ${data.gameCode}`);
    updatePlayersList(data.names);
    const isCreator = localStorage.getItem("isCreator") === "true";
    console.log(`[script.js/socket.on('gameJoined')] User is creator: ${isCreator}`);
    startGameButton.style.display = isCreator ? "block" : "none";
    console.log(`[script.js/socket.on('gameJoined')] Start button will ${isCreator ? "be shown" : "not be shown"}`);
});

socket.on("playerJoined", (data) => {
    console.log(`[script.js/socket.on('playerJoined')] Player joined: ${data.userId}`);
    updatePlayersList(data.names);
});

startGameButton.addEventListener("click", () => {
    const gameCode = waitingRoomGameCode.textContent.trim();
    console.log(`[script.js/startGameButton.click] Starting game for game code: ${gameCode}`);
    socket.emit("startGame", { gameCode });
});

socket.on("startGame", (data) => {
    console.log(`[script.js/socket.on('startGame')] Starting game for game code: ${data.gameCode}`);
    waitingRoomDiv.style.display = "none";
    gameDiv.style.display = "flex";

    currentRankingIndex = 0;
    rankings = data.names.map((name, index) => ({
        name,
        rank: index + 1,
    }));

    const topCriteria = data.rankingCriteria[1];
    const bottomCriteria = data.rankingCriteria[2];

    topLabel.textContent = topCriteria;
    bottomLabel.textContent = bottomCriteria;

    sortableList.innerHTML = "";
    rankings.forEach(({ name }) => {
        const li = document.createElement("li");
        li.textContent = name;
        sortableList.appendChild(li);
    });

    new Sortable(sortableList, {
        animation: 150,
        ghostClass: 'dragging',
        onEnd: () => {
            const updatedRankings = Array.from(sortableList.children).map((li, index) => ({
                name: li.textContent,
                rank: index + 1
            }));
            console.log(`[script.js] Updated Rankings: ${JSON.stringify(updatedRankings)}`);

            const gameCode = waitingRoomGameCode.textContent.trim();
            socket.emit("updateRankings", { gameCode, userId, rankings: updatedRankings });
        }
    });

    const gameCode = waitingRoomGameCode.textContent.trim();
    socket.emit("updateRankings", { gameCode, userId, rankings });
});

lockButton.addEventListener("click", () => {
    const rankings = Array.from(sortableList.children).map((li, index) => ({
        name: li.textContent,
        rank: index + 1,
    }));
    const gameCode = waitingRoomGameCode.textContent.trim();

    console.log(`[script.js/lockButton.click] Rankings locked in: ${JSON.stringify(rankings)}`);

    socket.emit("submitRankings", { gameCode, userId, rankings });

    gameDiv.style.display = "none";
    resultDiv.style.display = "flex";
    resultText.textContent = "Waiting for all votes...";
    finalResultsList.innerHTML = ""; // Ensure final results are hidden until all votes are in
});

socket.on("displayFinalResults", (data) => {
    console.log(`[script.js/socket.on('displayFinalResults')] Displaying final results`);
    resultText.textContent = "Final Rankings";

    const topCriteria = data.rankingCriteria ? data.rankingCriteria[1] : "Top";
    const bottomCriteria = data.rankingCriteria ? data.rankingCriteria[2] : "Bottom";

    topLabel.textContent = topCriteria;
    bottomLabel.textContent = bottomCriteria;

    finalResultsList.innerHTML = "";
    data.finalResults.forEach((result) => {
        const li = document.createElement("li");
        li.textContent = `${result.name} (${result.rank})`;
        finalResultsList.appendChild(li);
    });
    nextButton.style.display = localStorage.getItem("isCreator") === "true" ? "block" : "none";
});

nextButton.addEventListener("click", () => {
    const gameCode = waitingRoomGameCode.textContent.trim();
    console.log(`[script.js/nextButton.click] Moving to next ranking for game code: ${gameCode}`);
    socket.emit("nextRanking", { gameCode });
});

socket.on("refreshRanking", (data) => {
    console.log(`[script.js/socket.on('refreshRanking')] Refreshing rankings for new round`);

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
});

function updatePlayersList(names) {
    playersList.innerHTML = "";
    names.forEach((name) => {
        const li = document.createElement("li");
        li.textContent = name;
        playersList.appendChild(li);
    });
}
