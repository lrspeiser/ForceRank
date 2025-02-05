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
                                creator: gameData.creator,
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

            const actualIsCreator = gameData.creator === userId;

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
                        creator: gameData.creator,
                    });
                    break;
                case "completed":
                    const { groupRanking, playerVotes } = calculateFinalResults(
                        gameData.rankings,
                        gameData.creator,
                    );
                    socket.emit("displayFinalResults", {
                        groupRanking,
                        playerVotes,
                        rankingTerm: gameData.rankingTerm,
                        creator: gameData.creator,
                        isCreator: actualIsCreator,
                    });
                    break;
            }
        });
    });
}

function handleQuitGame(socket, io) {
    socket.on("quitGame", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/handleQuitGame] Player quitting game: ${gameCode}, User ID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value", (snapshot) => {
            const game = snapshot.val();
            if (game && !game.demoMode) {
                // Only remove the player if it's not a demo game
                gameRef
                    .child(`players/${userId}`)
                    .remove()
                    .then(() => {
                        socket.leave(gameCode);
                        socket.emit("quitGameSuccess");
                        io.to(gameCode).emit("playerLeft", {
                            gameCode,
                            names: game.names,
                            playersCount: game.playersCount - 1,
                        });
                    })
                    .catch((error) => {
                        console.error(
                            `[gameplay.js/handleQuitGame] Error removing player: ${error}`,
                        );
                    });
            } else if (game && game.demoMode) {
                // For demo game, just remove the player from the room
                socket.leave(gameCode);
                socket.emit("quitGameSuccess");
            } else {
                console.log(
                    `[gameplay.js/handleQuitGame] Game ${gameCode} not found`,
                );
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
    socket.on("lockRankings", ({ gameCode, userId, rankings }) => {
        console.log(`[gameplay.js/lockRankings] Locking rankings for game code: ${gameCode}, User ID: ${userId}`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.transaction((game) => {
            if (game) {
                if (!game.players[userId]) {
                    console.error(`[gameplay.js/lockRankings] Player ${userId} not found in game ${gameCode}`);
                    return;
                }

                if (game.demoMode) {
                    // Handle demo game logic
                    game.totalVotes = (game.totalVotes || 0) + 1;
                    rankings.forEach(({ name, rank }) => {
                        if (!game.cumulativeScores[name]) {
                            game.cumulativeScores[name] = {};
                        }
                        if (!game.cumulativeScores[name][game.rankingTerm]) {
                            game.cumulativeScores[name][game.rankingTerm] = 0;
                        }
                        game.cumulativeScores[name][game.rankingTerm] += rank;
                    });

                    const currentRankingResults = Object.entries(game.cumulativeScores)
                        .map(([name, scores]) => ({
                            name,
                            score: scores[game.rankingTerm] / game.totalVotes,
                        }))
                        .sort((a, b) => a.score - b.score);

                    // Emit results immediately for demo mode
                    socket.emit("displayDemoResults", {
                        currentRankingResults,
                        playerVotes: { [userId]: rankings },
                        rankingTerm: game.rankingTerm,
                        nextRankingTerm: game.allRankings[(game.currentRankingIndex + 1) % game.allRankings.length],
                        isLastRanking: game.currentRankingIndex === game.allRankings.length - 1,
                    });
                } else {
                    // Regular game logic (unchanged)
                    game.players[userId].state = "Voted";
                    game.completed = (game.completed || 0) + 1;
                    game.rankings[userId] = rankings;

                    if (game.completed >= game.playersCount) {
                        const { groupRanking, playerVotes } = calculateFinalResults(game.rankings, game.creator);
                        game.state = "completed";
                        io.to(gameCode).emit("displayFinalResults", {
                            groupRanking,
                            playerVotes,
                            rankingTerm: game.rankingTerm,
                            creator: game.creator,
                            demoMode: false,
                        });
                    } else {
                        io.to(gameCode).emit("updateLockCount", {
                            lockedCount: game.completed,
                            playersCount: game.playersCount,
                            creator: game.creator,
                        });
                    }
                }
            }
            return game;
        });
    });
}


function handleStartNextRound(socket, io) {
    socket.on("startNextRound", ({ gameCode, userId }) => {
        console.log(`[gameplay.js/handleStartNextRound] Starting next round for game code: ${gameCode}`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.transaction(
            (game) => {
                if (game && game.demoMode) {
                    game.currentRankingIndex = (game.currentRankingIndex + 1) % game.allRankings.length;
                    game.rankingTerm = game.allRankings[game.currentRankingIndex];
                    game.rankings = {};
                    game.completed = 0;
                    game.totalVotes = 0;
                    Object.keys(game.players).forEach((playerId) => {
                        game.players[playerId].state = "Voting";
                    });
                }
                return game;
            },
            (error, committed, snapshot) => {
                if (error) {
                    console.error("[gameplay.js/handleStartNextRound] Error in transaction:", error);
                } else if (!committed) {
                    console.log("[gameplay.js/handleStartNextRound] Transaction not committed.");
                } else {
                    const updatedGame = snapshot.val();
                    io.to(gameCode).emit("startNewRound", {
                        names: updatedGame.names,
                        rankingTerm: updatedGame.rankingTerm,
                    });
                    console.log(`[gameplay.js/handleStartNextRound] Emitted startNewRound event for ${gameCode} with term: ${updatedGame.rankingTerm}`);
                }
            },
        );
    });
}

function handleGetFinalDemoResults(socket, io) {
    socket.on("getFinalDemoResults", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/handleGetFinalDemoResults] Getting final results for game code: ${gameCode}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value", (snapshot) => {
            const game = snapshot.val();
            if (game && game.demoMode) {
                const finalResults = Object.entries(game.cumulativeScores)
                    .map(([name, scores]) => ({
                        name,
                        totalScore:
                            Object.values(scores).reduce(
                                (sum, score) => sum + score,
                                0,
                            ) / game.totalVotes,
                    }))
                    .sort((a, b) => a.totalScore - b.totalScore);

                socket.emit("displayFinalDemoResults", {
                    finalResults,
                    allRankings: game.allRankings,
                });
            }
        });
    });
}

function calculateFinalResults(allRankings, creatorId) {
    const totalScores = {};
    const playerVotes = {};

    // Calculate total scores and store individual votes
    for (const [userId, rankings] of Object.entries(allRankings)) {
        playerVotes[userId] = rankings;
        rankings.forEach(({ name, rank }) => {
            if (!totalScores[name]) totalScores[name] = 0;
            totalScores[name] += rank;
        });
    }

    // Sort names by total score (ascending)
    let groupRanking = Object.entries(totalScores)
        .sort(([nameA, scoreA], [nameB, scoreB]) => {
            if (scoreA === scoreB) {
                // Use creator's vote as tiebreaker
                const creatorRankA = playerVotes[creatorId].find(
                    (r) => r.name === nameA,
                ).rank;
                const creatorRankB = playerVotes[creatorId].find(
                    (r) => r.name === nameB,
                ).rank;
                return creatorRankA - creatorRankB;
            }
            return scoreA - scoreB;
        })
        .map(([name], index) => ({ name, rank: index + 1 }));

    return { groupRanking, playerVotes };
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
                                creator: gameData.creator,
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
    socket.on("nextRanking", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/handleNextRanking] Moving to next ranking for game code: ${gameCode}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);
        const userRef = db.ref(`Users/${userId}`);

        Promise.all([gameRef.once("value"), userRef.once("value")])
            .then(([gameSnapshot, userSnapshot]) => {
                const game = gameSnapshot.val();
                const user = userSnapshot.val();

                if (game && user) {
                    game.version = (game.version || 0) + 1;
                    game.completed = 0;
                    game.state = "voting";
                    game.rankings = {};

                    const userRankings = user.rankings || [];
                    game.rankingTerm =
                        userRankings[game.version % userRankings.length];

                    Object.keys(game.players).forEach((playerId) => {
                        game.players[playerId].state = "Voting";
                    });

                    return gameRef.set(game).then(() => {
                        io.to(gameCode).emit("startNewRound", {
                            names: game.names,
                            rankingTerm: game.rankingTerm,
                        });
                        console.log(
                            `[gameplay.js/handleNextRanking] Emitted startNewRound for game ${gameCode} with term ${game.rankingTerm}`,
                        );
                    });
                } else {
                    console.error(
                        `[gameplay.js/handleNextRanking] Game or user not found for gameCode: ${gameCode}, userId: ${userId}`,
                    );
                }
            })
            .catch((error) => {
                console.error(
                    `[gameplay.js/handleNextRanking] Error updating game: ${error}`,
                );
            });
    });
}

// This function handles ending the game
function handleEndGame(socket, io) {
    socket.on("endGame", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/handleEndGame] Ending game: ${gameCode}, User ID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value").then((snapshot) => {
            const gameData = snapshot.val();
            if (gameData && gameData.creator === userId) {
                gameRef
                    .remove()
                    .then(() => {
                        io.to(gameCode).emit("gameEnded");
                        console.log(
                            `[gameplay.js/handleEndGame] Game ${gameCode} ended and removed from database`,
                        );
                    })
                    .catch((error) => {
                        console.error(
                            `[gameplay.js/handleEndGame] Error removing game from database: ${error}`,
                        );
                    });
            } else {
                console.log(
                    `[gameplay.js/handleEndGame] User ${userId} is not the creator of game ${gameCode}`,
                );
            }
        });
    });
}

// This function handles stopping the waiting for votes
function handleStopWaiting(socket, io) {
    socket.on("stopWaiting", ({ gameCode, userId }) => {
        console.log(
            `[gameplay.js/handleStopWaiting] Stopping wait for game: ${gameCode}, User ID: ${userId}`,
        );

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value").then((snapshot) => {
            const gameData = snapshot.val();
            if (gameData && gameData.creator === userId) {
                const { groupRanking, playerVotes } = calculateFinalResults(
                    gameData.rankings,
                    gameData.creator,
                );
                io.to(gameCode).emit("displayFinalResults", {
                    groupRanking,
                    playerVotes,
                    rankingTerm: gameData.rankingTerm,
                    creator: gameData.creator,
                    isCreator: userId === gameData.creator,
                });
                gameRef.update({ state: "completed" });
                console.log(
                    `[gameplay.js/handleStopWaiting] Forced display of final results for game ${gameCode}`,
                );
            } else {
                console.log(
                    `[gameplay.js/handleStopWaiting] User ${userId} is not the creator of game ${gameCode}`,
                );
            }
        });
    });
}

function handleJoinDemoMarvel(socket, io) {
    socket.on("joinDemoMarvel", ({ userId }) => {
        console.log(`[gameplay.js/handleJoinDemoMarvel] User ${userId} joining Marvel demo`);

        const demoGameCode = "MARVEL_DEMO";
        const marvelCharacters = ["Iron Man", "Captain America", "Thor", "Black Widow", "Hulk", "Spider-Man", "Thanos", "Loki"];

        const db = admin.database();
        const gameRef = db.ref(`games/${demoGameCode}`);
        const rankingsRef = db.ref("rankings");

        Promise.all([gameRef.once("value"), rankingsRef.once("value")])
            .then(([gameSnapshot, rankingsSnapshot]) => {
                let game = gameSnapshot.val();
                const allRankings = rankingsSnapshot.val() || [];

                if (!game) {
                    game = {
                        names: marvelCharacters,
                        creator: "SYSTEM",
                        players: {},
                        playersCount: 0,
                        completed: 0,
                        version: 0,
                        state: "voting",
                        rankings: {},
                        demoMode: true,
                        allRankings: allRankings,
                        currentRankingIndex: 0,
                        cumulativeScores: marvelCharacters.reduce((acc, char) => {
                            acc[char] = allRankings.reduce((scoreAcc, ranking) => {
                                scoreAcc[ranking] = 0;
                                return scoreAcc;
                            }, {});
                            return acc;
                        }, {}),
                        totalVotes: 0,
                    };
                }

                if (!game.players[userId]) {
                    game.players[userId] = { state: "Voting" };
                    game.playersCount++;
                }

                game.rankingTerm = game.allRankings[game.currentRankingIndex];

                return gameRef.set(game).then(() => game);
            })
            .then((game) => {
                socket.join(demoGameCode);
                socket.emit("joinedDemoMarvel", {
                    gameCode: demoGameCode,
                    names: marvelCharacters,
                    rankingTerm: game.rankingTerm,
                });
            })
            .catch((error) => {
                console.error(`[gameplay.js/handleJoinDemoMarvel] Error: ${error}`);
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
    handleEndGame,
    handleStopWaiting,
    handleQuitGame,
    handleJoinDemoMarvel,
    handleStartNextRound,
};
