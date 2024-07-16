// validation.js - don't remove this header or any logs

const admin = require("firebase-admin");
console.log("[validation.js] Firebase Admin initialized");

function writeUserToFirebase(userId) {
    const db = admin.database();
    const userRef = db.ref(`Users/${userId}`);

    return userRef
        .once("value")
        .then((snapshot) => {
            if (!snapshot.exists()) {
                console.log(
                    `[validation.js/writeUserToFirebase] User ${userId} does not exist. Creating new entry.`,
                );
                return userRef
                    .set({ userId })
                    .then(() => {
                        console.log(
                            `[validation.js/writeUserToFirebase] Added new user ${userId} to 'Users' directory`,
                        );
                    })
                    .catch((error) => {
                        console.error(
                            `[validation.js/writeUserToFirebase] Error writing user ${userId} to Firebase: ${error}`,
                        );
                    });
            } else {
                console.log(
                    `[validation.js/writeUserToFirebase] User ${userId} already exists in 'Users' directory`,
                );
            }
        })
        .catch((error) => {
            console.error(
                `[validation.js/writeUserToFirebase] Error checking if user ${userId} exists: ${error}`,
            );
        });
}

function handleCreateGame(socket, io) {
    socket.on("createGame", ({ gameCode, names, userId }) => {
        console.log(
            `[validation.js/socket.on('createGame')] Game code: ${gameCode}, Names: ${names.join(", ")}, UUID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);
        console.log(
            `[validation.js/createGame] Firebase ref created for gameCode: ${gameCode}`,
        );

        // Write user to Firebase
        writeUserToFirebase(userId)
            .then(() => {
                gameRef
                    .set({
                        names,
                        creator: userId,
                        players: { [userId]: { state: "Waiting" } },
                        playersCount: 1,
                        completed: 0,
                        version: 0,
                        state: "waiting",
                    })
                    .then(() => {
                        console.log(
                            `[validation.js/createGame] Game created with data: ${JSON.stringify(
                                {
                                    names,
                                    creator: userId,
                                    players: { [userId]: { state: "Waiting" } },
                                    playersCount: 1,
                                    completed: 0,
                                    version: 0,
                                    state: "waiting",
                                },
                            )}`,
                        );

                        socket.join(gameCode);
                        console.log(
                            `[validation.js/createGame] Socket joined room: ${gameCode}`,
                        );

                        io.to(gameCode).emit("gameJoined", {
                            gameCode,
                            names,
                            playersCount: 1,
                        });
                        console.log(
                            `[validation.js/createGame] Emitted 'gameJoined' event to room ${gameCode} with data: ${JSON.stringify(
                                {
                                    gameCode,
                                    names,
                                    playersCount: 1,
                                },
                            )}`,
                        );

                        socket.emit("joinedWaitingRoom", {
                            gameCode,
                            names,
                            playersCount: 1,
                            isCreator: true,
                        });
                    })
                    .catch((error) => {
                        console.error(
                            `[validation.js/createGame] Error creating game: ${error}`,
                        );
                    });
            })
            .catch((error) => {
                console.error(
                    `[validation.js/socket.on('createGame')] Error writing user to Firebase: ${error}`,
                );
            });
    });
}

function handleJoinGame(socket, io) {
    socket.on("joinGame", ({ gameCode, userId }) => {
        console.log(
            `[validation.js/socket.on('joinGame')] Game code: ${gameCode}, UUID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);
        console.log(
            `[validation.js/joinGame] Firebase ref created for gameCode: ${gameCode}`,
        );

        // Write user to Firebase
        writeUserToFirebase(userId)
            .then(() => {
                gameRef
                    .once("value")
                    .then((snapshot) => {
                        const gameData = snapshot.val() || {};
                        console.log(
                            `[validation.js/joinGame] Fetched game data: ${JSON.stringify(gameData)}`,
                        );

                        if (!gameData.players || !gameData.players[userId]) {
                            const newPlayersCount =
                                (gameData.playersCount || 0) + 1;

                            gameRef
                                .update({
                                    [`players/${userId}`]: { state: "Waiting" },
                                    playersCount: newPlayersCount,
                                })
                                .then(() => {
                                    console.log(
                                        `[validation.js/joinGame] Updated player count to ${newPlayersCount} for game code: ${gameCode}`,
                                    );

                                    socket.join(gameCode);
                                    console.log(
                                        `[validation.js/joinGame] Socket joined room: ${gameCode}`,
                                    );

                                    io.to(gameCode).emit("playerJoined", {
                                        gameCode,
                                        names: gameData.names,
                                        playersCount: newPlayersCount,
                                    });

                                    socket.emit("joinedWaitingRoom", {
                                        gameCode,
                                        names: gameData.names,
                                        playersCount: newPlayersCount,
                                        isCreator: false,
                                    });
                                });
                        } else {
                            console.log(
                                `[validation.js/joinGame] User ${userId} already joined game ${gameCode}`,
                            );

                            socket.join(gameCode);
                            socket.emit("joinedWaitingRoom", {
                                gameCode,
                                names: gameData.names,
                                playersCount: gameData.playersCount,
                                isCreator: false,
                            });
                        }
                    })
                    .catch((error) => {
                        console.error(
                            `[validation.js/joinGame] Error fetching game data: ${error}`,
                        );
                    });
            })
            .catch((error) => {
                console.error(
                    `[validation.js/socket.on('joinGame')] Error writing user to Firebase: ${error}`,
                );
            });
    });
}

function handleGameExists(socket, io) {
    socket.on("checkGameExists", ({ gameCode, userId }) => {
        console.log(
            `[validation.js/socket.on('checkGameExists')] Checking if game exists for game code: ${gameCode}, UUID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);
        console.log(
            `[validation.js/checkGameExists] Firebase ref created for gameCode: ${gameCode}`,
        );

        gameRef
            .once("value")
            .then((snapshot) => {
                const gameData = snapshot.val();
                console.log(
                    `[validation.js/checkGameExists] Fetched game data: ${JSON.stringify(gameData)}`,
                );

                if (gameData) {
                    const userExists =
                        gameData.players && gameData.players[userId];
                    console.log(
                        `[validation.js/checkGameExists] Game exists: true, User exists: ${userExists}`,
                    );
                    socket.emit("gameExists", {
                        exists: true,
                        userExists,
                        gameCode,
                        userId,
                        state: gameData.state,
                        names: gameData.names,
                        playersCount: gameData.playersCount,
                        rankingCriteria: gameData.rankingCriteria || [
                            "Rank",
                            "Top",
                            "Bottom",
                        ],
                    });
                } else {
                    console.log(
                        "[validation.js/checkGameExists] Game exists: false",
                    );
                    socket.emit("gameExists", {
                        exists: false,
                        userExists: false,
                        gameCode,
                        userId,
                        state: null,
                    });
                    // Clear local storage if game does not exist
                    socket.emit("clearLocalStorage");
                }
            })
            .catch((error) => {
                console.error(
                    `[validation.js/checkGameExists] Error fetching game data: ${error}`,
                );
            });
    });
}

module.exports = {
    handleCreateGame,
    handleJoinGame,
    handleGameExists,
};
