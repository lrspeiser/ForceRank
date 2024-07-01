const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const admin = require("firebase-admin");

const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://slider-3b16e-default-rtdb.firebaseio.com",
});

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
    console.log("[server.js/io.on(connection)] A user connected");

    socket.on("createGame", ({ gameCode, names, userId }) => {
        console.log(`[server.js/socket.on('createGame')] Game code: ${gameCode}, Names: ${names.join(", ")}, UUID: ${userId}`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);
        gameRef.set({ names, creator: userId, playersCount: 1, completed: 0, version: 0, state: "waiting" });

        socket.join(gameCode);
        io.to(gameCode).emit("gameJoined", { gameCode, names });
    });

    socket.on("joinGame", ({ gameCode, userId }) => {
        console.log(`[server.js/socket.on('joinGame')] Game code: ${gameCode}, UUID: ${userId}`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);
        gameRef.once("value", (snapshot) => {
            const gameData = snapshot.val() || {};
            gameRef.child("playersCount").transaction((count) => (count || 0) + 1);
            socket.join(gameCode);
            io.to(gameCode).emit("playerJoined", { userId, names: gameData.names });

            if (gameData.state === "waiting") {
                gameRef.child("state").set("voting");
                console.log(`[server.js/joinGame] Game state set to voting for game code: ${gameCode}`);

                const version = gameData.version || 0;
                const rankingsRef = db.ref('rankings');
                rankingsRef.once("value", (rankingsSnapshot) => {
                    const allRankings = rankingsSnapshot.val() || [];
                    const rankingCriteria = allRankings[version];
                    io.to(gameCode).emit("startGame", { gameCode, names: gameData.names, rankingCriteria });
                });
            }
        });
    });

    socket.on("checkGameExists", ({ gameCode, userId }) => {
        console.log(`[server.js/socket.on('checkGameExists')] Checking if game code ${gameCode} exists`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value", (snapshot) => {
            const exists = snapshot.exists();
            let userExists = false;
            if (exists) {
                const players = snapshot.child("players").val() || {};
                userExists = players.hasOwnProperty(userId);
            }
            socket.emit("gameExists", { exists, userExists, gameCode, userId });
        });
    });

    socket.on("startGame", ({ gameCode }) => {
        console.log(`[server.js/socket.on('startGame')] Starting game for game code: ${gameCode}`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value", (gameSnapshot) => {
            const gameData = gameSnapshot.val() || {};
            const version = gameData.version || 0;

            const rankingsRef = db.ref('rankings');
            rankingsRef.once("value", (rankingsSnapshot) => {
                const allRankings = rankingsSnapshot.val() || [];
                const rankingCriteria = allRankings[version];

                const initialRankings = gameData.names.map((name, index) => ({
                    name,
                    rank: index + 1,
                }));

                for (const playerId of Object.keys(gameData.players || {})) {
                    db.ref(`games/${gameCode}/rankings/${playerId}`).set(initialRankings);
                }

                gameRef.child("state").set("voting");
                console.log(`[server.js/startGame] Game state set to voting for game code: ${gameCode}`);
                io.to(gameCode).emit("startGame", { gameCode, names: gameData.names, rankingCriteria });
            });
        });
    });

    socket.on("updateRankings", ({ gameCode, userId, rankings }) => {
        console.log(`[server.js/socket.on('updateRankings')] Game code: ${gameCode}, User ID: ${userId}, Rankings: ${JSON.stringify(rankings)}`);

        const db = admin.database();
        const userRankingsRef = db.ref(`games/${gameCode}/rankings/${userId}`);

        userRankingsRef.set(rankings);
    });

    socket.on("submitRankings", ({ gameCode, userId, rankings }) => {
        console.log(`[server.js/socket.on('submitRankings')] Game code: ${gameCode}, User ID: ${userId}, Rankings: ${JSON.stringify(rankings)}`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);
        const userRankingsRef = gameRef.child(`rankings/${userId}`);
        const completedRef = gameRef.child("completed");

        userRankingsRef.set(rankings);

        completedRef.transaction((current) => (current || 0) + 1);

        gameRef.once("value", (snapshot) => {
            const gameData = snapshot.val();
            const playerCount = gameData.playersCount;
            completedRef.once("value", (compSnap) => {
                if (compSnap.val() === playerCount) {
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

                    console.log(`[server.js] Final Scores: ${JSON.stringify(finalScores)}`);

                    const sortedResults = Object.entries(finalScores)
                        .map(([name, score]) => ({ name, score }))
                        .sort((a, b) => a.score - b.score);

                    const highestScore = sortedResults[0].score;
                    const finalResults = sortedResults.map((item, index) => ({
                        ...item,
                        rank: index === 0 ? `Rank 1` : `Rank ${index + 1}`,
                    }));

                    // Clear user rankings
                    for (const playerId of Object.keys(gameData.rankings)) {
                        db.ref(`games/${gameCode}/rankings/${playerId}`).remove();
                    }

                    // Reset completed count
                    gameRef.child("completed").set(0);
                    gameRef.child("state").set("waiting");
                    console.log(`[server.js/submitRankings] Game state set to waiting for game code: ${gameCode}`);

                    io.to(gameCode).emit("displayFinalResults", { finalResults, rankingCriteria: gameData.rankingCriteria });
                }
            });
        });
    });

    socket.on("nextRanking", ({ gameCode }) => {
        console.log(`[server.js/socket.on('nextRanking')] Next ranking for game code: ${gameCode}`);

        const db = admin.database();
        const gameRef = db.ref(`games/${gameCode}`);

        gameRef.once("value", (snapshot) => {
            const gameData = snapshot.val() || {};
            const newVersion = (gameData.version || 0) + 1;

            gameRef.child("version").set(newVersion);
            gameRef.child("completed").set(0);
            gameRef.child("rankings").remove();

            const rankingsRef = db.ref('rankings');
            rankingsRef.once("value", (rankingsSnapshot) => {
                const allRankings = rankingsSnapshot.val() || [];
                const rankingCriteria = allRankings[newVersion];
                const names = gameData.names;
                const initialRankings = names.map((name, index) => ({
                    name,
                    rank: index + 1,
                }));

                for (const playerId of Object.keys(gameData.players || {})) {
                    db.ref(`games/${gameCode}/rankings/${playerId}`).set(initialRankings);
                }

                gameRef.child("state").set("voting");
                console.log(`[server.js/nextRanking] Game state set to voting for game code: ${gameCode}`);
                io.to(gameCode).emit("refreshRanking", { names, rankingCriteria });
            });
        });
    });

    socket.on("disconnect", () => {
        console.log("[server.js/io.on(disconnect)] A user disconnected");
    });
});

server.listen(PORT, () => {
    console.log(`[server.js/server.listen] Server running on port ${PORT}`);
});
