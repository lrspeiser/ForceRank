// gameplay.js - do not remove this header or logs

const admin = require("firebase-admin");
console.log("[gameplay.js] Firebase Admin module required");

// This function handles the logic for starting a game
function handleStartGame(socket, io) {
    socket.on("startGame", ({ gameCode, userId }) => {
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

                    const updates = {
                        rankingTerm: rankingTerm,
                        state: "voting",
                    };

                    // Initialize rankings for each player
                    Object.keys(gameData.players).forEach((playerId) => {
                        updates[`players/${playerId}/state`] = "Voting";
                        updates[`rankings/${playerId}`] = gameData.names.map(
                            (name, index) => ({
                                name,
                                rank: index + 1,
                            }),
                        );
                    });

                    gameRef
                        .update(updates)
                        .then(() => {
                            io.to(gameCode).emit("startGame", {
                                gameCode,
                                names: gameData.names,
                                rankingTerm,
                                playersCount: gameData.playersCount,
                            });
                        })
                        .catch((error) => {
                            console.error(
                                `[gameplay.js/startGame] Error updating game state: ${error}`,
                            );
                        });
                });
        });
    });
}

// This function handles the logic for rejoining a game
function handleRejoinGame(socket, io) {
    socket.on("rejoinGame", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/socket.on('rejoinGame')] Rejoining game: ${gameCode}, User ID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value").then((snapshot) => {
            const gameData = snapshot.val();
            if (!gameData) {
                console.log(
                    `[gameplay.js/rejoinGame] Game ${gameCode} not found`,
                );
                socket.emit("gameNotFound");
                return;
            }

            socket.join(gameCode);

            switch (gameData.state) {
                case "waiting":
                    socket.emit("joinedWaitingRoom", {
                        gameCode,
                        names: gameData.names,
                        playersCount: gameData.playersCount,
                        isCreator: gameData.creator === userId,
                    });
                    break;
                case "voting":
                    socket.emit("startGame", {
                        gameCode,
                        names: gameData.names,
                        rankingTerm: gameData.rankingTerm,
                        playersCount: gameData.playersCount,
                    });
                    break;
                case "completed":
                    // Emit final results
                    const finalResults = calculateFinalResults(
                        gameData.rankings,
                    );
                    socket.emit("displayFinalResults", {
                        finalResults,
                        rankingTerm: gameData.rankingTerm,
                    });
                    break;
            }
        });
    });
}

// This function handles updating the rankings for a user
function handleUpdateRankings(socket, io) {
    socket.on("updateRankings", ({ gameCode, userId, rankings }) => {
        console.log(
            `[gameplay.js/socket.on('updateRankings')] Updating rankings for game code: ${gameCode}, User ID: ${userId}`,
        );

        if (!gameCode) {
            console.error(
                `[gameplay.js/updateRankings] Error: No game code provided for user ${userId}`,
            );
            return;
        }

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef
            .child(`rankings/${userId}`)
            .set(rankings)
            .then(() => {
                console.log(
                    `[gameplay.js/updateRankings] Rankings updated for user ${userId} in game ${gameCode}`,
                );
            })
            .catch((error) => {
                console.error(
                    `[gameplay.js/updateRankings] Error updating rankings: ${error}`,
                );
            });
    });
}

// This function handles locking in the rankings for a user
function handleLockRankings(socket, io) {
    socket.on("lockRankings", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/socket.on('lockRankings')] Locking rankings for game code: ${gameCode}, User ID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.transaction((game) => {
            if (game) {
                if (!game.players[userId]) {
                    console.error(
                        `[gameplay.js/lockRankings] Player ${userId} not found in game ${gameCode}`,
                    );
                    return;
                }
                game.players[userId].state = "Voted";
                game.completed = (game.completed || 0) + 1;

                if (game.completed >= game.playersCount) {
                    game.state = "completed";
                    const finalResults = calculateFinalResults(game.rankings);
                    io.to(gameCode).emit("displayFinalResults", {
                        finalResults,
                        rankingTerm: game.rankingTerm,
                    });
                } else {
                    io.to(gameCode).emit("updateLockCount", {
                        lockedCount: game.completed,
                        playersCount: game.playersCount,
                    });
                }
            }
            return game;
        });
    });
}

function calculateFinalScores(allRankings) {
    const finalScores = {};
    for (const userRankings of Object.values(allRankings)) {
        userRankings.forEach(({ name, rank }) => {
            if (!finalScores[name]) {
                finalScores[name] = 0;
            }
            finalScores[name] += rank;
        });
    }
    return finalScores;
}

function calculateFinalResults(finalScores) {
    return Object.entries(finalScores)
        .map(([name, score]) => ({ name, score }))
        .sort((a, b) => a.score - b.score)
        .map((item, index) => ({
            name: item.name,
            rank: `Rank ${index + 1}`,
        }));
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
                const newRankingCriteria =
                    allRankings[newVersion % allRankings.length];

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
                        io.to(gameCode).emit("startNewRound", {
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
