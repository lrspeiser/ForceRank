import { socket } from "./socket.js";
import {
    showElement,
    hideElement,
    updateTextContent,
    updatePlayersList,
} from "./domUtils.js";
import { generateGameCode } from "./utils.js";
import { getUserId } from "./uuidManager.js";

const eventListeners = () => {
    console.log("[eventListeners.js] Setting up event listeners");

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
    const joinGameSubmitButton = document.getElementById(
        "joinGameSubmitButton",
    );
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
    const waitingVotesCount = document.getElementById("waitingVotesCount");

    let currentRankingIndex = 0;
    let rankings = [];
    let userId = localStorage.getItem("userId");

    console.log(
        "[eventListeners.js] Checking for existing UUID in local storage",
    );
    if (!userId) {
        userId = uuidv4();
        localStorage.setItem("userId", userId);
        console.log(
            `[eventListeners.js] No existing UUID found. Assigning new UUID: ${userId}`,
        );
    } else {
        console.log(
            `[eventListeners.js] Found existing UUID: ${userId}. Checking if user is in a game`,
        );
    }

    const storedGameCode = localStorage.getItem("gameCode");

    if (storedGameCode && userId) {
        console.log(
            `[eventListeners.js] Found stored game code: ${storedGameCode}, UUID: ${userId}`,
        );
        socket.emit("checkGameExists", { gameCode: storedGameCode, userId });
    } else {
        console.log(
            "[eventListeners.js] No stored game code found. Showing start screen.",
        );
        showElement(startDiv);
    }

    console.log(
        "[eventListeners.js] Adding event listener to 'createGameButton'",
    );
    createGameButton.addEventListener("click", () => {
        console.log(
            "[eventListeners.js/createGameButton.click] Hiding start screen and showing create game screen",
        );
        hideElement(startDiv);
        showElement(createGameDiv);
    });

    console.log(
        "[eventListeners.js] Adding event listener to 'submitNamesButton'",
    );
    submitNamesButton.addEventListener("click", () => {
        const names = namesInput.value
            .split(/[\n,]+/)
            .map((name) => name.trim())
            .filter((name) => name);
        if (names.length > 0) {
            const gameCode = generateGameCode();
            userId = localStorage.getItem("userId");
            console.log(
                `[eventListeners.js/submitNamesButton.click] Game code: ${gameCode}, Names: ${names}, UUID: ${userId}, Creator: true`,
            );
            fetch("/createGame", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ gameCode, names, userId }),
            })
                .then((response) => response.json())
                .then((data) => {
                    console.log(
                        `[eventListeners.js/submitNamesButton.click] Response from server: ${data}`,
                    );
                    if (data.status === "success") {
                        localStorage.setItem("gameCode", gameCode);
                        localStorage.setItem("isCreator", "true");
                        socket.emit("createGame", { gameCode, names, userId });
                        console.log(
                            "[eventListeners.js/submitNamesButton.click] Hiding create game screen and showing waiting room",
                        );
                        hideElement(createGameDiv);
                        showElement(waitingRoomDiv);
                        updateTextContent(waitingRoomGameCode, gameCode);
                        const invitation = `Hey player, help me Force Rank ${names.join(", ")}. Go to http://forcerank.replit.app/?gameid=${gameCode}`;
                        invitationText.value = invitation;
                        invitationText.focus();
                        invitationText.select();
                        console.log(
                            `[eventListeners.js/submitNamesButton.click] Invitation text: ${invitation}`,
                        );
                    } else {
                        console.error(
                            "[eventListeners.js/submitNamesButton.click] Error creating game in backend",
                        );
                    }
                })
                .catch((error) => {
                    console.error(
                        `[eventListeners.js/submitNamesButton.click] Error: ${error}`,
                    );
                });
        } else {
            console.log(
                "[eventListeners.js/submitNamesButton.click] Names input is empty",
            );
        }
    });

    console.log(
        "[eventListeners.js] Adding event listener to 'joinGameButton'",
    );
    joinGameButton.addEventListener("click", () => {
        console.log(
            "[eventListeners.js/joinGameButton.click] Hiding start screen and showing join game screen",
        );
        hideElement(startDiv);
        showElement(joinGameDiv);
    });

    console.log(
        "[eventListeners.js] Adding event listener to 'joinGameSubmitButton'",
    );
    joinGameSubmitButton.addEventListener("click", async () => {
        const gameCode = gameCodeInput.value.trim();
        const userId = await getUserId();

        if (gameCode) {
            console.log(
                `[eventListeners.js/joinGameSubmitButton.click] Game code: ${gameCode}, UUID: ${userId}`,
            );
            socket.emit("joinGame", { gameCode, userId });
            localStorage.setItem("gameCode", gameCode);
            localStorage.removeItem("isCreator");
            console.log(
                "[eventListeners.js/joinGameSubmitButton.click] Removed creator flag from local storage",
            );
            console.log(
                "[eventListeners.js/joinGameSubmitButton.click] Hiding join game screen and showing waiting room",
            );
            hideElement(joinGameDiv);
            showElement(waitingRoomDiv);
            updateTextContent(waitingRoomGameCode, gameCode);
            console.log(
                `[eventListeners.js/joinGameSubmitButton.click] Game code: ${gameCode}`,
            );
        } else {
            console.log(
                "[eventListeners.js/joinGameSubmitButton.click] Game code input is empty",
            );
        }
    });

    console.log("[eventListeners.js] Adding event listener to 'lockButton'");
    lockButton.addEventListener("click", () => {
        console.log(
            "[eventListeners.js/lockButton.click] Click event triggered",
        );
        const gameCode = localStorage.getItem("gameCode");
        console.log(
            `[eventListeners.js/lockButton.click] Retrieved game code from local storage: ${gameCode}`,
        );
        const userId = localStorage.getItem("userId");
        console.log(
            `[eventListeners.js/lockButton.click] Retrieved user ID from local storage: ${userId}`,
        );

        console.log(
            `[eventListeners.js/lockButton.click] Locking in rankings for game code: ${gameCode}, User ID: ${userId}`,
        );

        if (gameCode && userId) {
            console.log(
                `[eventListeners.js/lockButton.click] Emitting 'lockRankings' event`,
            );
            socket.emit("lockRankings", { gameCode, userId, rankings });
        } else {
            console.log(
                "[eventListeners.js/lockButton.click] Error: Game code or user ID is null",
            );
        }
    });

    console.log(
        "[eventListeners.js] Adding event listener to 'startGameButton'",
    );
    startGameButton.addEventListener("click", () => {
        const gameCode = localStorage.getItem("gameCode");
        const userId = localStorage.getItem("userId");

        if (gameCode && userId) {
            console.log(
                `[eventListeners.js/startGameButton.click] Starting game for game code: ${gameCode}, User ID: ${userId}`,
            );
            socket.emit("startGame", { gameCode, userId });
        } else {
            console.log(
                "[eventListeners.js/startGameButton.click] Error: Game code or user ID is null",
            );
        }
    });

    console.log("[eventListeners.js] Adding event listener to 'nextButton'");
    nextButton.addEventListener("click", () => {
        const gameCode = waitingRoomGameCode
            ? waitingRoomGameCode.textContent.trim()
            : null;
        if (gameCode) {
            console.log(
                `[eventListeners.js/nextButton.click] Moving to next ranking for game code: ${gameCode}`,
            );
            socket.emit("nextRanking", { gameCode });
        } else {
            console.log(
                "[eventListeners.js/nextButton.click] Error: Game code is null",
            );
        }
    });

    console.log("[eventListeners.js] Adding window load event listener");
    window.addEventListener("load", () => {
        const urlParams = new URLSearchParams(window.location.search);
        const gameCode = urlParams.get("gameid");

        if (gameCode) {
            console.log(`[eventListeners.js] Game code from URL: ${gameCode}`);
            userId = localStorage.getItem("userId");
            if (!userId) {
                userId = uuidv4();
                localStorage.setItem("userId", userId);
            }
            localStorage.setItem("gameCode", gameCode);
            localStorage.removeItem("isCreator");
            console.log(
                "[eventListeners.js] Removed creator flag from local storage",
            );

            socket.emit("checkGameExists", { gameCode, userId });

            socket.on(
                "gameExists",
                ({ exists, userExists, state, names, playersCount }) => {
                    if (exists) {
                        console.log(
                            `[eventListeners.js] Game exists in Firebase: ${gameCode}`,
                        );
                        socket.emit("joinGame", { gameCode, userId });
                        console.log(
                            "[eventListeners.js] Hiding start, create, and join screens and showing waiting room",
                        );
                        hideElement(startDiv);
                        hideElement(createGameDiv);
                        hideElement(joinGameDiv);
                        showElement(waitingRoomDiv);
                        updateTextContent(waitingRoomGameCode, gameCode);
                        updatePlayersList(names, playersCount);
                    } else {
                        console.log(
                            `[eventListeners.js] Game not found in Firebase: ${gameCode}`,
                        );
                        localStorage.removeItem("gameCode");
                        showElement(startDiv);
                    }
                },
            );
        } else {
            console.log(
                "[eventListeners.js] No game code from URL. Showing start screen.",
            );
            showElement(startDiv);
        }
    });

    // Initialize SortableJS on the sortable list
    if (sortableList) {
        console.log("[eventListeners.js] Initializing Sortable on #sortable");

        new Sortable(sortableList, {
            animation: 150,
            ghostClass: "dragging",
            onStart: function (evt) {
                console.log("[eventListeners.js] Drag started", evt);
            },
            onEnd: function (evt) {
                console.log("[eventListeners.js] Drag ended", evt);
                const updatedRankings = Array.from(sortableList.children).map(
                    (li, index) => ({
                        name: li.textContent,
                        rank: index + 1,
                    }),
                );
                console.log(
                    `[eventListeners.js] Updated Rankings: ${JSON.stringify(updatedRankings)}`,
                );
                const gameCode = localStorage.getItem("gameCode");
                const userId = localStorage.getItem("userId");
                if (gameCode) {
                    socket.emit("updateRankings", {
                        gameCode,
                        userId,
                        rankings: updatedRankings,
                    });
                } else {
                    console.log(
                        "[eventListeners.js] Error: Game code is null during ranking update",
                    );
                }
            },
            onSort: function (evt) {
                console.log("[eventListeners.js] List sorted", evt);
            },
        });
    }

    console.log("[eventListeners.js] Event listeners setup complete");

    socket.on("playerJoined", ({ gameCode, names, playersCount }) => {
        console.log(
            `[eventListeners.js/socket.on('playerJoined')] Game code: ${gameCode}, Players: ${playersCount}`,
        );
        updatePlayersList(names, playersCount);
        const waitingRoomGameCode = document.getElementById(
            "waitingRoomGameCode",
        );
        if (waitingRoomGameCode) {
            waitingRoomGameCode.textContent = gameCode;
        }
        showElement(waitingRoomDiv);
    });

    socket.on("updatePlayersList", ({ names, playersCount }) => {
        updatePlayersList(names, playersCount);
        const playerCountElement = document.getElementById("playerCount");
        if (playerCountElement) {
            playerCountElement.textContent = `${playersCount} Players`;
        }
    });

    socket.on(
        "startGame",
        ({ gameCode, names, rankingCriteria, playersCount }) => {
            console.log(
                `[eventListeners.js/socket.on('startGame')] Starting game for game code: ${gameCode}`,
            );
            localStorage.setItem("gameCode", gameCode); // Added this line to ensure gameCode is saved to local storage
            hideElement(waitingRoomDiv);
            showElement(gameDiv);
            updateTextContent(topLabel, rankingCriteria[1]);
            updateTextContent(bottomLabel, rankingCriteria[2]);
            sortableList.innerHTML = "";
            names.forEach((name) => {
                const li = document.createElement("li");
                li.textContent = name;
                sortableList.appendChild(li);
            });
            new Sortable(sortableList, {
                animation: 150,
                ghostClass: "dragging",
                onEnd: () => {
                    const updatedRankings = Array.from(
                        sortableList.children,
                    ).map((li, index) => ({
                        name: li.textContent,
                        rank: index + 1,
                    }));
                    const gameCode = localStorage.getItem("gameCode");
                    const userId = localStorage.getItem("userId");
                    socket.emit("updateRankings", {
                        gameCode,
                        userId,
                        rankings: updatedRankings,
                    });
                },
            });
        },
    );

    socket.on(
        "showWaitingRoom",
        ({ gameCode, lockedCount, playersCount, names }) => {
            console.log(
                `[eventListeners.js/socket.on('showWaitingRoom')] Showing waiting room for game code: ${gameCode}`,
            );
            hideElement(gameDiv);
            showElement(waitingRoomDiv);
            updatePlayersList(names, playersCount);
            const waitingVotesText =
                document.getElementById("waitingVotesText");
            if (waitingVotesText) {
                waitingVotesText.textContent = `Waiting on ${playersCount - lockedCount} voters`;
            }
        },
    );

    socket.on("displayFinalResults", ({ finalResults, rankingCriteria }) => {
        console.log(
            `[eventListeners.js/socket.on('displayFinalResults')] Displaying final results`,
        );
        hideElement(gameDiv);
        showElement(resultDiv);
        finalResultsList.innerHTML = "";
        finalResults.forEach((result) => {
            const li = document.createElement("li");
            li.textContent = `${result.name} - Group Rank: ${result.rank}`;
            finalResultsList.appendChild(li);
        });
        nextButton.style.display =
            localStorage.getItem("isCreator") === "true" ? "block" : "none";
    });

    socket.on("showResults", ({ gameCode, finalResults, rankingCriteria }) => {
        console.log(
            `[eventListeners.js/socket.on('showResults')] Showing results for game code: ${gameCode}`,
        );
        hideElement(gameDiv);
        showElement(resultDiv);
        finalResultsList.innerHTML = "";
        finalResults.forEach((result) => {
            const li = document.createElement("li");
            li.textContent = `${result.name} (${result.rank})`;
            finalResultsList.appendChild(li);
        });
        nextButton.style.display =
            localStorage.getItem("isCreator") === "true" ? "block" : "none";
    });

    socket.on("refreshRanking", ({ names, rankingCriteria }) => {
        console.log(
            `[eventListeners.js/socket.on('refreshRanking')] Refreshing rankings for new round`,
        );
        hideElement(resultDiv);
        showElement(gameDiv);
        updateTextContent(topLabel, rankingCriteria[1]);
        updateTextContent(bottomLabel, rankingCriteria[2]);
        sortableList.innerHTML = "";
        names.forEach((name) => {
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
                const gameCode = localStorage.getItem("gameCode");
                const userId = localStorage.getItem("userId");
                socket.emit("updateRankings", {
                    gameCode,
                    userId,
                    rankings: updatedRankings,
                });
            },
        });
    });

    socket.on("updateLockCount", ({ lockedCount, playersCount }) => {
        console.log(
            `[eventListeners.js/socket.on('updateLockCount')] Updating lock count: ${lockedCount}/${playersCount}`,
        );
        if (lockCount) {
            lockCount.textContent = `${lockedCount}/${playersCount} players locked in`;
            console.log(
                `[eventListeners.js/socket.on('updateLockCount')] Lock count text updated: ${lockedCount}/${playersCount} players locked in`,
            );
        }
        if (waitingVotesText) {
            waitingVotesText.textContent = `${lockedCount}/${playersCount} votes placed`;
            console.log(
                `[eventListeners.js/socket.on('updateLockCount')] Waiting votes text updated: ${lockedCount}/${playersCount} votes placed`,
            );
        }
        if (waitingVotesCount) {
            waitingVotesCount.textContent = `${lockedCount}/${playersCount} votes placed`;
            console.log(
                `[eventListeners.js/socket.on('updateLockCount')] Waiting votes count text updated: ${lockedCount}/${playersCount} votes placed`,
            );
        }
    });
};

export default eventListeners;
