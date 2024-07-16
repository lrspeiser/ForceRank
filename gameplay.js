const admin = require("firebase-admin");
console.log("[gameplay.js] Firebase Admin module required");

// This function handles the logic for starting a game
function handleStartGame(socket, io) {
    console.log("[gameplay.js/handleStartGame] Function initialized");
    socket.on("startGame", ({ gameCode }) => {
        console.log(
            `[gameplay.js/socket.on('startGame')] Starting game for game code: ${gameCode}`,
        );

        const db = admin.database();
        console.log(
            "[gameplay.js/socket.on('startGame')] Firebase database initialized",
        );
        const gameRef = db.ref(`games/${gameCode}`);
        console.log(
            `[gameplay.js/socket.on('startGame')] Firebase reference created for game code: ${gameCode}`,
        );

        gameRef.once("value").then((gameSnapshot) => {
            console.log(
                "[gameplay.js/socket.on('startGame')] Fetching game data",
            );
            const gameData = gameSnapshot.val() || {};
            console.log(
                `[gameplay.js/startGame] Fetched game data: ${JSON.stringify(gameData)}`,
            );
            const version = gameData.version || 0;
            console.log(`[gameplay.js/startGame] Game version: ${version}`);

            const rankingsRef = db.ref("rankings");
            console.log(
                "[gameplay.js/socket.on('startGame')] Fetching rankings data",
            );
            rankingsRef.once("value").then((rankingsSnapshot) => {
                const allRankings = rankingsSnapshot.val() || [];
                const rankingCriteria = allRankings[version] || [
                    "Rank",
                    "Top",
                    "Bottom",
                ];
                console.log(
                    `[gameplay.js/startGame] Fetched ranking criteria: ${JSON.stringify(rankingCriteria)}`,
                );

                const initialRankings = gameData.names.map((name, index) => ({
                    name,
                    rank: index + 1,
                }));
                console.log(
                    `[gameplay.js/startGame] Initial rankings: ${JSON.stringify(initialRankings)}`,
                );

                for (const playerId of Object.keys(gameData.players || {})) {
                    db.ref(`games/${gameCode}/rankings/${playerId}`)
                        .set(initialRankings)
                        .then(() => {
                            console.log(
                                `[gameplay.js/startGame] Initial rankings set for player ${playerId}: ${JSON.stringify(initialRankings)}`,
                            );
                        });
                    db.ref(`games/${gameCode}/players/${playerId}/state`)
                        .set("Voting")
                        .then(() => {
                            console.log(
                                `[gameplay.js/startGame] Set player ${playerId} state to 'Voting'`,
                            );
                        });
                }

                gameRef
                    .child("rankingCriteria")
                    .set(rankingCriteria)
                    .then(() => {
                        console.log(
                            `[gameplay.js/startGame] Ranking criteria set for game code: ${gameCode}`,
                        );
                    });

                gameRef
                    .child("state")
                    .set("voting")
                    .then(() => {
                        console.log(
                            `[gameplay.js/startGame] Game state set to voting for game code: ${gameCode}`,
                        );
                    });

                io.to(gameCode).emit("startGame", {
                    gameCode,
                    names: gameData.names,
                    rankingCriteria,
                    playersCount: gameData.playersCount,
                });
                console.log(
                    `[gameplay.js/startGame] Emitted 'startGame' event to room ${gameCode} with data: ${JSON.stringify({ gameCode, names: gameData.names, rankingCriteria, playersCount: gameData.playersCount })}`,
                );
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

                                io.to(gameCode).emit("displayFinalResults", {
                                    finalResults,
                                    rankingCriteria: gameData.rankingCriteria,
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
    console.log("[gameplay.js/handleNextRanking] Function initialized");
    socket.on("nextRanking", ({ gameCode }) => {
        console.log(
            `[gameplay.js/socket.on('nextRanking')] Next ranking for game code: ${gameCode}`,
        );

        const db = admin.database();
        console.log(
            "[gameplay.js/socket.on('nextRanking')] Firebase database initialized",
        );
        const gameRef = db.ref(`games/${gameCode}`);
        console.log(
            `[gameplay.js/socket.on('nextRanking')] Firebase reference created for game code: ${gameCode}`,
        );

        gameRef.once("value").then((snapshot) => {
            console.log(
                "[gameplay.js/socket.on('nextRanking')] Fetching game data",
            );
            const gameData = snapshot.val() || {};
            console.log(
                `[gameplay.js/nextRanking] Fetched game data: ${JSON.stringify(gameData)}`,
            );
            const newVersion = (gameData.version || 0) + 1;
            console.log(`[gameplay.js/nextRanking] New version: ${newVersion}`);

            gameRef
                .child("version")
                .set(newVersion)
                .then(() => {
                    console.log(
                        `[gameplay.js/nextRanking] Version incremented to ${newVersion} for game code: ${gameCode}`,
                    );
                });
            gameRef
                .child("completed")
                .set(0)
                .then(() => {
                    console.log(
                        `[gameplay.js/nextRanking] Completed count reset for game code: ${gameCode}`,
                    );
                });
            gameRef
                .child("rankings")
                .remove()
                .then(() => {
                    console.log(
                        `[gameplay.js/nextRanking] Rankings cleared for game code: ${gameCode}`,
                    );
                });

            const rankingsRef = db.ref("rankings");
            console.log(
                "[gameplay.js/socket.on('nextRanking')] Fetching rankings data",
            );
            rankingsRef.once("value").then((rankingsSnapshot) => {
                const allRankings = rankingsSnapshot.val() || [];
                const rankingCriteria = allRankings[newVersion];
                console.log(
                    `[gameplay.js/nextRanking] Fetched ranking criteria: ${JSON.stringify(rankingCriteria)}`,
                );
                const names = gameData.names;
                const initialRankings = names.map((name, index) => ({
                    name,
                    rank: index + 1,
                }));
                console.log(
                    `[gameplay.js/nextRanking] Initial rankings: ${JSON.stringify(initialRankings)}`,
                );

                for (const playerId of Object.keys(gameData.players || {})) {
                    db.ref(`games/${gameCode}/rankings/${playerId}`)
                        .set(initialRankings)
                        .then(() => {
                            console.log(
                                `[gameplay.js/nextRanking] Initial rankings set for player ${playerId}: ${JSON.stringify(initialRankings)}`,
                            );
                        });
                    db.ref(`games/${gameCode}/players/${playerId}/state`)
                        .set("Voting")
                        .then(() => {
                            console.log(
                                `[gameplay.js/nextRanking] Set player ${playerId} state to 'Voting'`,
                            );
                        });
                }

                gameRef
                    .child("state")
                    .set("voting")
                    .then(() => {
                        console.log(
                            `[gameplay.js/nextRanking] Game state set to voting for game code: ${gameCode}`,
                        );
                    });

                io.to(gameCode).emit("refreshRanking", {
                    names,
                    rankingCriteria,
                });
                console.log(
                    `[gameplay.js/nextRanking] Emitted 'refreshRanking' event to room ${gameCode} with data: ${JSON.stringify({ names, rankingCriteria })}`,
                );
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
