// server.js - do not remove this header or any of the log statements within

console.log("[server.js] Requiring express module");
const express = require("express"); // Express framework for building web applications
console.log("[server.js] Requiring http module");
const http = require("http"); // Node.js module for creating an HTTP server
console.log("[server.js] Requiring socket.io module");
const socketIo = require("socket.io"); // Socket.io for real-time communication
console.log("[server.js] Requiring path module");
const path = require("path"); // Node.js module for working with file and directory paths
console.log("[server.js] Requiring firebase-admin module");
const admin = require("firebase-admin"); // Firebase Admin SDK for accessing Firebase services

// Parse the Firebase service account key from environment variables
console.log("[server.js] Parsing Firebase service account key");
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);

// Initialize the Firebase Admin SDK with the service account credentials and database URL
console.log("[server.js] Initializing Firebase Admin SDK");
try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://slider-3b16e-default-rtdb.firebaseio.com",
    });
    console.log("[server.js] Firebase Admin SDK initialized successfully");
} catch (error) {
    console.error("[server.js] Error initializing Firebase Admin SDK:", error);
}

// Create an instance of an Express application
console.log("[server.js] Creating Express application instance");
const app = express();
// Create an HTTP server using the Express application
console.log("[server.js] Creating HTTP server");
const server = http.createServer(app);
// Create a new instance of socket.io by passing the HTTP server
console.log("[server.js] Initializing socket.io instance");
const io = socketIo(server);

// Define the port number on which the server will listen
console.log("[server.js] Defining server port");
const PORT = process.env.PORT || 3000;

// Middleware to serve static files from the "public" directory
console.log(
    "[server.js] Setting up middleware to serve static files from 'public' directory",
);
app.use(express.static(path.join(__dirname, "public")));

// Middleware to parse JSON bodies
app.use(express.json());

// Import game-related event handlers from external modules
console.log(
    "[server.js] Importing game-related event handlers from external modules",
);
const {
    handleCreateGame, // Function to handle game creation
    handleJoinGame, // Function to handle joining a game
    handleGameExists, // Function to check if a game exists
} = require("./validation"); // Import from validation.js
const {
    handleStartGame, // Function to handle starting a game
    handleUpdateRankings, // Function to handle updating rankings
    handleSubmitRankings, // Function to handle submitting rankings
    handleNextRanking, // Function to handle moving to the next ranking round
    handleRejoinGame, // Function to handle rejoining a game
    handleLockRankings,
} = require("./gameplay"); // Import from gameplay.js

function initializeUserTerms(userId) {
    const db = admin.database();
    const userRef = db.ref(`Users/${userId}`);
    const termsRef = userRef.child("Terms");

    termsRef.once("value", (snapshot) => {
        if (!snapshot.exists()) {
            db.ref("rankings").once("value", (rankingsSnapshot) => {
                const defaultTerms = rankingsSnapshot.val() || [];
                termsRef
                    .set(defaultTerms)
                    .then(() =>
                        console.log(
                            `[server.js/initializeUserTerms] Default terms set for user ${userId}`,
                        ),
                    )
                    .catch((error) =>
                        console.error(
                            `[server.js/initializeUserTerms] Error setting default terms for user ${userId}:`,
                            error,
                        ),
                    );
            });
        }
    });
}

// Set up a connection event listener for socket.io
console.log("[server.js] Setting up socket.io connection event listener");
io.on("connection", (socket) => {
    // Log a message when a user connects
    console.log("[server.js/io.on(connection)] A user connected");

    socket.on("initUser", ({ userId }) => {
        console.log(
            `[server.js/socket.on(initUser)] Initializing user: ${userId}`,
        );
        initializeUserTerms(userId);
    });

    // Attach event handlers for game-related actions
    console.log("[server.js] Attaching game-related event handlers");
    handleCreateGame(socket, io); // Attach the create game handler
    handleJoinGame(socket, io); // Attach the join game handler
    handleGameExists(socket, io); // Attach the check game exists handler
    handleStartGame(socket, io); // Attach the start game handler
    handleUpdateRankings(socket, io); // Attach the update rankings handler
    handleSubmitRankings(socket, io); // Attach the submit rankings handler
    handleNextRanking(socket, io); // Attach the next ranking handler
    handleRejoinGame(socket, io); // Attach the rejoin game handler
    handleLockRankings(socket, io); // Attach the lock rankings handler

    // Set up a disconnect event listener for socket.io
    console.log("[server.js] Setting up socket.io disconnect event listener");
    socket.on("disconnect", () => {
        // Log a message when a user disconnects
        console.log("[server.js/io.on(disconnect)] A user disconnected");
    });
});

app.get("/initUser/:userId", async (req, res) => {
  const userId = req.params.userId;
  console.log(`[server.js/initUser] Initializing user: ${userId}`);

  try {
    const userRef = admin.database().ref(`Users/${userId}`);
    const snapshot = await userRef.once('value');

    if (!snapshot.exists()) {
      const rankings = await admin.database().ref('rankings').once('value');
      const userRankings = rankings.val() || [];

      await userRef.set({
        userId: userId,
        rankings: userRankings
      });
      console.log(`[server.js/initUser] Created new user: ${userId}`);
    } else {
      console.log(`[server.js/initUser] User already exists: ${userId}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error(`[server.js/initUser] Error initializing user: ${error}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to check if a user exists in Firebase
app.get("/checkUser/:userId", (req, res) => {
    const userId = req.params.userId;
    console.log(`[server.js/checkUser] Checking if user exists in Firebase: ${userId}`);

    admin.database().ref(`Users/${userId}`).once("value")
        .then((snapshot) => {
            const exists = snapshot.exists();
            console.log(`[server.js/checkUser] User ${userId} exists: ${exists}`);
            res.json({ exists });
        })
        .catch((error) => {
            console.error(`[server.js/checkUser] Error checking user in Firebase: ${error}`);
            res.status(500).json({ error: "Error checking user" });
        });
});

app.get("/getRankings", (req, res) => {
    console.log("[server.js/getRankings] Fetching rankings");
    admin.database().ref('rankings').once('value')
        .then((snapshot) => {
            const rankings = snapshot.val() || [];
            res.json({ rankings });
        })
        .catch((error) => {
            console.error("[server.js/getRankings] Error fetching rankings:", error);
            res.status(500).json({ error: "Error fetching rankings" });
        });
});

app.post("/writeUser", (req, res) => {
    const { userId, rankings } = req.body;
    console.log(`[server.js/writeUser] Writing user to Firebase: ${userId}`);

    admin.database().ref(`Users/${userId}`).set({ userId, rankings })
        .then(() => {
            console.log(`[server.js/writeUser] Successfully wrote user to Firebase: ${userId}`);
            res.status(200).send("User written to Firebase");
        })
        .catch((error) => {
            console.error(`[server.js/writeUser] Error writing user to Firebase: ${error}`);
            res.status(500).send("Error writing user to Firebase");
        });
});


// Endpoint to log button click
app.post("/logClick", (req, res) => {
    console.log("[server.js] Received logClick request");

    const { userId, buttonId } = req.body;
    const timestamp = new Date().toISOString();
    console.log(
        `[server.js] Logging click: userId=${userId}, buttonId=${buttonId}, timestamp=${timestamp}`,
    );

    admin
        .database()
        .ref("logs/buttonClicks")
        .push({ userId, buttonId, timestamp })
        .then(() => {
            console.log(`[server.js] Click logged successfully`);
            res.status(200).send("Click logged successfully");
        })
        .catch((error) => {
            console.error(`[server.js] Error logging click: ${error}`);
            res.status(500).send("Error logging click");
        });
});

app.get("/checkGameExists/:gameCode", (req, res) => {
  const gameCode = req.params.gameCode;
  console.log(`[server.js/checkGameExists] Checking if game exists in Firebase: ${gameCode}`);

  admin.database().ref(`games/${gameCode}`).once("value")
    .then((snapshot) => {
      const exists = snapshot.exists();
      console.log(`[server.js/checkGameExists] Game ${gameCode} exists: ${exists}`);
      res.json({ exists });
    })
    .catch((error) => {
      console.error(`[server.js/checkGameExists] Error checking game in Firebase: ${error}`);
      res.status(500).json({ error: "Error checking game" });
    });
});



app.get("/checkUserAndGame/:userId/:gameCode", (req, res) => {
  const userId = req.params.userId;
  const gameCode = req.params.gameCode;
  console.log(`[server.js/checkUserAndGame] Checking user ${userId} and game ${gameCode}`);

  const db = admin.database();
  const userRef = db.ref(`Users/${userId}`);
  const gameRef = db.ref(`games/${gameCode}`);

  Promise.all([userRef.once("value"), gameRef.once("value")])
    .then(([userSnapshot, gameSnapshot]) => {
      const userExists = userSnapshot.exists();
      const gameExists = gameSnapshot.exists();
      const gameState = gameExists ? gameSnapshot.val().state : null;
      console.log(`[server.js/checkUserAndGame] User exists: ${userExists}, Game exists: ${gameExists}, Game state: ${gameState}`);
      res.json({ userExists, gameExists, gameState });
    })
    .catch((error) => {
      console.error(`[server.js/checkUserAndGame] Error checking user and game: ${error}`);
      res.status(500).json({ error: "Error checking user and game" });
    });
});

// Start the HTTP server and listen on the specified port
console.log("[server.js] Starting HTTP server");
server.listen(PORT, () => {
    // Log a message when the server starts successfully
    console.log(`[server.js/server.listen] Server running on port ${PORT}`);
});
