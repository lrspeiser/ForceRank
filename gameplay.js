const admin = require("firebase-admin");
console.log("[gameplay.js] Firebase Admin module required");

// This function handles the logic for starting a game
function handleStartGame(socket, io) {
    socket.on("startGame", ({ gameCode }) => {
        console.log(
            `[gameplay.js/socket.on('startGame')] Starting game for game code: ${gameCode}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value").then((gameSnapshot) => {
            const gameData = gameSnapshot.val() || {};
            const version = gameData.version || 0;

            db.ref("rankings")
                .once("value")
                .then((rankingsSnapshot) => {
                    const allRankings = rankingsSnapshot.val() || [];
                    const rankingTerm =
                        allRankings[version % allRankings.length];

                    gameRef
                        .update({
                            rankingTerm: rankingTerm,
                            state: "voting",
                        })
                        .then(() => {
                            io.to(gameCode).emit("startGame", {
                                gameCode,
                                names: gameData.names,
                                rankingTerm,
                                playersCount: gameData.playersCount,
                            });
                        });
                });
        });
    });
}

// This function handles the logic for rejoining a game
function handleRejoinGame(socket, io) {
    console.log("[gameplay.js/handleRejoinGame] Function initialized");
    socket.on("rejoinGame", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/socket.on('rejoinGame')] Rejoining game for game code: ${gameCode}, User ID: ${userId}`,
        );

        const db = admin.database();
        console.log(
            "[gameplay.js/socket.on('rejoinGame')] Firebase database initialized",
        );
        const gameRef = db.ref(`games/${gameCode}`);
        console.log(
            `[gameplay.js/socket.on('rejoinGame')] Firebase reference created for game code: ${gameCode}`,
        );

        gameRef.once("value").then((snapshot) => {
            console.log(
                "[gameplay.js/socket.on('rejoinGame')] Fetching game data",
            );
            const gameData = snapshot.val() || {};
            console.log(
                `[gameplay.js/rejoinGame] Fetched game data: ${JSON.stringify(gameData)}`,
            );

            socket.join(gameCode);
            console.log(
                `[gameplay.js/rejoinGame] Socket joined room: ${gameCode}`,
            );

            const playerState = gameData.players[userId]?.state;
            console.log(
                `[gameplay.js/rejoinGame] Player state: ${playerState}`,
            );

            if (playerState === "Voted") {
                const completedCount = gameData.completed;
                const playersCount = gameData.playersCount;
                console.log(
                    `[gameplay.js/rejoinGame] Completed count: ${completedCount}, Players count: ${playersCount}`,
                );
                if (completedCount >= playersCount) {
                    const allRankings = gameData.rankings;
                    const finalScores = {};

                    for (const userRankings of Object.values(allRankings)) {
                        userRankings.forEach(({ name, rank }) => {
                            if (!finalScores[name]) {
                                finalScores[name] = 0;
                            }
                            finalScores[name] += rank;
                        });
                    }

                    console.log(
                        `[gameplay.js] Final Scores: ${JSON.stringify(finalScores)}`,
                    );

                    const sortedResults = Object.entries(finalScores)
                        .map(([name, score]) => ({ name, score }))
                        .sort((a, b) => a.score - b.score);

                    const finalResults = sortedResults.map((item, index) => ({
                        name: item.name,
                        rank: `Rank ${index + 1}`,
                    }));

                    socket.emit("displayFinalResults", {
                        gameCode,
                        finalResults,
                        rankingCriteria: gameData.rankingCriteria,
                    });
                    console.log(
                        `[gameplay.js/rejoinGame] Emitted 'displayFinalResults' event to user ${socket.id} with data: ${JSON.stringify({ gameCode, finalResults, rankingCriteria: gameData.rankingCriteria })}`,
                    );
                    return;
                }
            }

            socket.emit("startGame", {
                gameCode,
                names: gameData.names,
                rankingCriteria: gameData.rankingCriteria || [
                    "Rank",
                    "Top",
                    "Bottom",
                ],
                playersCount: gameData.playersCount,
            });
            console.log(
                `[gameplay.js/rejoinGame] Emitted 'startGame' event to user ${socket.id} with data: ${JSON.stringify({ gameCode, names: gameData.names, rankingCriteria: gameData.rankingCriteria, playersCount: gameData.playersCount })}`,
            );
        });
    });
}

// This function handles updating the rankings for a user
function handleUpdateRankings(socket, io) {
    console.log("[gameplay.js/handleUpdateRankings] Function initialized");
    socket.on("updateRankings", ({ gameCode, userId, rankings }) => {
        console.log(
            `[gameplay.js/socket.on('updateRankings')] Game code: ${gameCode}, User ID: ${userId}, Rankings: ${JSON.stringify(rankings)}`,
        );

        const db = admin.database();
        console.log(
            "[gameplay.js/socket.on('updateRankings')] Firebase database initialized",
        );
        const userRankingsRef = db.ref(`games/${gameCode}/rankings/${userId}`);
        console.log(
            `[gameplay.js/socket.on('updateRankings')] Firebase reference created for game code: ${gameCode}, user ID: ${userId}`,
        );

        userRankingsRef.set(rankings).then(() => {
            console.log(
                `[gameplay.js/updateRankings] Rankings updated for user ${userId} in game ${gameCode}: ${JSON.stringify(rankings)}`,
            );
        });
    });
}

// This function handles locking in the rankings for a user
function handleLockRankings(socket, io) {
    console.log("[gameplay.js/handleLockRankings] Function initialized");
    socket.on("lockRankings", ({ gameCode, userId, rankings }) => {
        console.log(
            `[gameplay.js/socket.on('lockRankings')] Locking rankings for game code: ${gameCode}, User ID: ${userId}, Rankings: ${JSON.stringify(rankings)}`,
        );

        const db = admin.database();
        console.log(
            "[gameplay.js/socket.on('lockRankings')] Firebase database initialized",
        );
        const gameRef = db.ref(`games/${gameCode}`);
        const userRankingsRef = gameRef.child(`rankings/${userId}`);
        const completedRef = gameRef.child("completed");
        console.log(
            `[gameplay.js/socket.on('lockRankings')] Firebase reference created for game code: ${gameCode}`,
        );

        userRankingsRef.once("value").then((snapshot) => {
            console.log(
                `[gameplay.js/lockRankings] Current rankings for user ${userId}: ${JSON.stringify(snapshot.val())}`,
            );
        });

        userRankingsRef.set(rankings).then(() => {
            console.log(
                `[gameplay.js/lockRankings] Rankings set for user ${userId}`,
            );

            db.ref(`games/${gameCode}/players/${userId}/state`)
                .set("Voted")
                .then(() => {
                    console.log(
                        `[gameplay.js/lockRankings] Player state set to 'Voted' for user ${userId}`,
                    );
                });

            completedRef
                .transaction((current) => (current || 0) + 1)
                .then(() => {
                    console.log(
                        `[gameplay.js/lockRankings] Incremented completed count for game ${gameCode}`,
                    );

                    gameRef.once("value").then((snapshot) => {
                        const gameData = snapshot.val();
                        console.log(
                            `[gameplay.js/lockRankings] Fetched game data: ${JSON.stringify(gameData)}`,
                        );

                        const playerCount = gameData.playersCount;
                        completedRef.once("value").then((compSnap) => {
                            const lockedCount = compSnap.val();
                            console.log(
                                `[gameplay.js/lockRankings] Current lock count: ${lockedCount}/${playerCount}`,
                            );

                            if (lockedCount >= playerCount) {
                                const allRankings = gameData.rankings || {};
                                const finalScores = {};

                                for (const userRankings of Object.values(
                                    allRankings,
                                )) {
                                    userRankings.forEach(({ name, rank }) => {
                                        if (!finalScores[name]) {
                                            finalScores[name] = 0;
                                        }
                                        finalScores[name] += rank;
                                    });
                                }

                                console.log(
                                    `[gameplay.js] Final Scores: ${JSON.stringify(finalScores)}`,
                                );

                                const sortedResults = Object.entries(
                                    finalScores,
                                )
                                    .map(([name, score]) => ({ name, score }))
                                    .sort((a, b) => a.score - b.score);

                                const finalResults = sortedResults.map(
                                    (item, index) => ({
                                        ...item,
                                        rank: `Rank ${index + 1}`,
                                    }),
                                );

                                gameRef
                                    .child("rankingTerm")
                                    .once("value", (termSnapshot) => {
                                        const rankingTerm = termSnapshot.val();
                                        io.to(gameCode).emit(
                                            "displayFinalResults",
                                            {
                                                finalResults,
                                                rankingTerm,
                                            },
                                        );
                                    });
                                console.log(
                                    `[gameplay.js/lockRankings] Emitted 'displayFinalResults' event to room ${gameCode} with data: ${JSON.stringify({ finalResults, rankingCriteria: gameData.rankingCriteria })}`,
                                );

                                for (const playerId of Object.keys(
                                    gameData.rankings || {},
                                )) {
                                    db.ref(
                                        `games/${gameCode}/rankings/${playerId}`,
                                    )
                                        .remove()
                                        .then(() => {
                                            console.log(
                                                `[gameplay.js/lockRankings] Cleared rankings for player ${playerId} in game ${gameCode}`,
                                            );
                                        });
                                }

                                gameRef
                                    .child("completed")
                                    .set(0)
                                    .then(() => {
                                        console.log(
                                            `[gameplay.js/lockRankings] Reset completed count for game ${gameCode}`,
                                        );
                                    });

                                gameRef
                                    .child("state")
                                    .set("waiting")
                                    .then(() => {
                                        console.log(
                                            `[gameplay.js/lockRankings] Game state set to waiting for game ${gameCode}`,
                                        );
                                    });
                            } else {
                                gameRef
                                    .child(`players/${userId}/state`)
                                    .once("value")
                                    .then((stateSnapshot) => {
                                        const userState = stateSnapshot.val();
                                        if (userState === "Voted") {
                                            socket.emit("showWaitingRoom", {
                                                gameCode,
                                                lockedCount,
                                                playersCount: playerCount,
                                                names: gameData.names,
                                            });
                                            console.log(
                                                `[gameplay.js/lockRankings] Emitted 'showWaitingRoom' event to user ${userId} with lock count: ${lockedCount}/${playerCount}`,
                                            );

                                            io.to(gameCode).emit(
                                                "updateLockCount",
                                                {
                                                    lockedCount,
                                                    playersCount: playerCount,
                                                },
                                            );
                                            console.log(
                                                `[gameplay.js/lockRankings] Emitted 'updateLockCount' event to room ${gameCode} with lock count: ${lockedCount}/${playerCount}`,
                                            );
                                        } else {
                                            console.log(
                                                `[gameplay.js/lockRankings] User ${userId} is not yet confirmed to have voted. Staying on voting screen.`,
                                            );
                                        }
                                    });
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.log(
                        `[gameplay.js/lockRankings] Error setting rankings for user ${userId}: ${error}`,
                    );
                });
        });
    });
}

// This function handles submitting the rankings for a user
function handleSubmitRankings(socket, io) {
    console.log("[gameplay.js/handleSubmitRankings] Function initialized");
    socket.on("submitRankings", ({ gameCode, userId, rankings }) => {
        console.log(
            `[gameplay.js/socket.on('submitRankings')] Game code: ${gameCode}, User ID: ${userId}`,
        );

        const db = admin.database();
        console.log(
            "[gameplay.js/socket.on('submitRankings')] Firebase database initialized",
        );
        const gameRef = db.ref(`games/${gameCode}`);
        const userRankingsRef = gameRef.child(`rankings/${userId}`);
        const completedRef = gameRef.child("completed");
        console.log(
            `[gameplay.js/socket.on('submitRankings')] Firebase reference created for game code: ${gameCode}, user ID: ${userId}`,
        );

        userRankingsRef.set(rankings).then(() => {
            console.log(
                `[gameplay.js/submitRankings] Rankings set for user ${userId}: ${JSON.stringify(rankings)}`,
            );
        });

        completedRef
            .transaction((current) => (current || 0) + 1)
            .then(() => {
                console.log(
                    `[gameplay.js/submitRankings] Incremented completed count for game ${gameCode}`,
                );

                gameRef.once("value").then((snapshot) => {
                    const gameData = snapshot.val();
                    console.log(
                        `[gameplay.js/submitRankings] Fetched game data: ${JSON.stringify(gameData)}`,
                    );
                    const playerCount = gameData.playersCount;
                    completedRef.once("value").then((compSnap) => {
                        if (compSnap.val() === playerCount) {
                            const allRankings = gameData.rankings || {};
                            const finalScores = {};

                            for (const userRankings of Object.values(
                                allRankings,
                            )) {
                                userRankings.forEach(({ name, rank }) => {
                                    if (!finalScores[name]) {
                                        finalScores[name] = 0;
                                    }
                                    finalScores[name] += rank;
                                });
                            }

                            console.log(
                                `[gameplay.js] Final Scores: ${JSON.stringify(finalScores)}`,
                            );

                            const sortedResults = Object.entries(finalScores)
                                .map(([name, score]) => ({ name, score }))
                                .sort((a, b) => a.score - b.score);

                            const finalResults = sortedResults.map(
                                (item, index) => ({
                                    name: item.name,
                                    rank: index + 1,
                                }),
                            );

                            io.to(gameCode).emit("showResults", {
                                gameCode,
                                finalResults,
                                rankingCriteria: gameData.rankingCriteria,
                            });
                            console.log(
                                `[gameplay.js/submitRankings] Emitted 'showResults' event to room ${gameCode} with data: ${JSON.stringify({ finalResults, rankingCriteria: gameData.rankingCriteria })}`,
                            );
                        } else {
                            io.to(gameCode).emit("showWaitingRoom", {
                                gameCode,
                                lockedCount: compSnap.val(),
                                playersCount: playerCount,
                                names: gameData.names,
                            });
                            console.log(
                                `[gameplay.js/submitRankings] Emitted 'showWaitingRoom' event to room ${gameCode} with lock count: ${compSnap.val()}/${playerCount}`,
                            );

                            io.to(gameCode).emit("updateLockCount", {
                                lockedCount: compSnap.val(),
                                playersCount: playerCount,
                            });
                            console.log(
                                `[gameplay.js/submitRankings] Emitted 'updateLockCount' event to room ${gameCode} with lock count: ${compSnap.val()}/${playerCount}`,
                            );
                        }
                    });
                });
            });
    });
}

// This function handles moving to the next ranking round
function handleNextRanking(socket, io) {
    socket.on("nextRanking", ({ gameCode }) => {
        console.log(
            `[gameplay.js/handleNextRanking] Moving to next ranking for game code: ${gameCode}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value").then((snapshot) => {
            const gameData = snapshot.val();
            if (!gameData) {
                console.log(
                    `[gameplay.js/handleNextRanking] Game not found: ${gameCode}`,
                );
                return;
            }

            const newVersion = (gameData.version || 0) + 1;
            console.log(
                `[gameplay.js/handleNextRanking] New game version: ${newVersion}`,
            );

            const rankingsRef = db.ref("rankings");
            rankingsRef.once("value").then((rankingsSnapshot) => {
                const allRankings = rankingsSnapshot.val() || [];
                const newRankingCriteria = allRankings[newVersion] || [
                    "Rank",
                    "Top",
                    "Bottom",
                ];

                gameRef
                    .update({
                        version: newVersion,
                        rankingCriteria: newRankingCriteria,
                        state: "voting",
                        completed: 0,
                    })
                    .then(() => {
                        console.log(
                            `[gameplay.js/handleNextRanking] Game updated for next round: ${gameCode}`,
                        );
                        io.to(gameCode).emit("refreshRanking", {
                            names: gameData.names,
                            rankingCriteria: newRankingCriteria,
                        });
                    });
            });
        });
    });
}

module.exports = {
    handleStartGame,
    handleUpdateRankings,
    handleSubmitRankings,
    handleNextRanking,
    handleRejoinGame,
    handleLockRankings,
};
