import { v4 as uuidv4 } from "https://cdn.jsdelivr.net/npm/uuid@8.3.2/+esm";
import {
  hideElement,
  showElement,
  updateTextContent,
  updatePlayersList,
} from "./domUtils.js";

console.log("[main.js] Import statements executed");

const socket = io();
console.log("[main.js] Socket initialized");

function logFetchCall(url, options) {
  console.log(
    `[main.js/logFetchCall] Fetch call being made to: ${url} with options: ${JSON.stringify(options)}`,
  );
}

function getRankings() {
  const sortableItems = document.querySelectorAll("#sortable .sortable-item");
  return Array.from(sortableItems).map((item, index) => ({
    name: item.textContent,
    rank: index + 1,
  }));
}

function initializeGame(gameCode, names, rankingTerm, playersCount) {
  console.log(
    `[main.js/initializeGame] Initializing game: ${gameCode}, Players: ${playersCount}`,
  );
  hideElement("waitingRoom");
  showElement("game");
  updateTextContent("rankingLabel", `Who is the most ${rankingTerm}?`);

  const rankNumbers = document.getElementById("rankNumbers");
  rankNumbers.innerHTML = names
    .map((_, index) => `<div class="rank-number">${index + 1}</div>`)
    .join("");

  initializeSortableList(names);
}

function initializeSortableList(names) {
  const sortableList = document.getElementById("sortable");
  sortableList.innerHTML = names
    .map((name) => `<li class="sortable-item">${name}</li>`)
    .join("");

  new Sortable(sortableList, {
    animation: 150,
    ghostClass: "sortable-ghost",
    onEnd: () => {
      const updatedRankings = getRankings();
      const gameCode = localStorage.getItem("gameCode");
      const userId = localStorage.getItem("userId");
      socket.emit("updateRankings", {
        gameCode,
        userId,
        rankings: updatedRankings,
      });
    },
  });

  // Emit initial rankings
  const initialRankings = getRankings();
  const gameCode = localStorage.getItem("gameCode");
  const userId = localStorage.getItem("userId");
  socket.emit("updateRankings", {
    gameCode,
    userId,
    rankings: initialRankings,
  });
}

socket.on("updateLockCount", ({ lockedCount, playersCount }) => {
  console.log(
    `[main.js/socket.on('updateLockCount')] Lock count updated: ${lockedCount}/${playersCount}`,
  );
  updateTextContent(
    "waitingVotesText",
    `${lockedCount}/${playersCount} votes placed`,
  );
});

socket.on("displayFinalResults", ({ finalResults, rankingTerm }) => {
  console.log(
    "[main.js/socket.on('displayFinalResults')] Displaying final results",
  );
  hideElement("waitingForVotes");
  showElement("result");
  updateTextContent("resultLabel", `Final Results for: Most ${rankingTerm}`);

  const finalResultsList = document.getElementById("finalResults");
  finalResultsList.innerHTML = finalResults
    .map((result) => `<li>${result.name} - ${result.rank}</li>`)
    .join("");
});

function showFinalResults() {
  console.log(`[main.js/showFinalResults] Called`);
  hideElement("waitingRoom");
  showElement("result");
  console.log(`[main.js/showFinalResults] Showing final results`);
}

function initializeEventListeners() {
  console.log("[main.js/initializeEventListeners] Setting up event listeners");

  const createGameButton = document.getElementById("createGameButton");
  const joinGameButton = document.getElementById("joinGameButton");
  const submitNamesButton = document.getElementById("submitNamesButton");
  const joinGameSubmitButton = document.getElementById("joinGameSubmitButton");
  const startGameButton = document.getElementById("startGameButton");
  const lockButton = document.getElementById("lockButton");
  const createGameDiv = document.getElementById("createGame");
  const nameInputsContainer = document.getElementById("nameInputs");
  const nextButton = document.getElementById("nextButton");
  if (nextButton) {
    nextButton.addEventListener("click", () => {
      console.log("[main.js/nextButton.click] Next button clicked");
      const gameCode = localStorage.getItem("gameCode");
      if (gameCode) {
        console.log(
          `[main.js/nextButton.click] Requesting next round for game code: ${gameCode}`,
        );
        socket.emit("nextRanking", { gameCode });
      } else {
        console.log(
          "[main.js/nextButton.click] Error: No game code found in local storage",
        );
      }
    });
  }

  if (createGameButton) {
    createGameButton.addEventListener("click", () => {
      console.log(
        "[main.js/createGameButton.click] Create Game button clicked",
      );
      hideElement("start");
      showElement("createGame");
    });
  }

  if (joinGameButton) {
    joinGameButton.addEventListener("click", () => {
      console.log("[main.js/joinGameButton.click] Join Game button clicked");
      hideElement("start");
      showElement("joinGame");
    });
  }

  if (createGameDiv) {
    createGameDiv.addEventListener("input", (event) => {
      if (event.target.classList.contains("nameInput")) {
        handleNameInput(event.target);
      }
    });
  }

  if (submitNamesButton) {
    submitNamesButton.addEventListener("click", () => {
      console.log(
        "[main.js/submitNamesButton.click] Submit Names button clicked",
      );
      const names = getValidNames();
      if (names.length >= 2) {
        const gameCode = generateGameCode();
        const userId = localStorage.getItem("userId"); // Use the existing UUID from local storage
        console.log(
          `[main.js/submitNamesButton.click] Game code: ${gameCode}, Names: ${names.join(", ")}, UUID: ${userId}`,
        );
        socket.emit("createGame", { gameCode, names, userId });
      } else {
        console.log(
          "[main.js/submitNamesButton.click] Not enough valid names entered",
        );
        alert("Please enter at least 2 names.");
      }
    });
  }

  if (joinGameSubmitButton) {
    joinGameSubmitButton.addEventListener("click", () => {
      console.log(
        "[main.js/joinGameSubmitButton.click] Join Game Submit button clicked",
      );
      const gameCodeInput = document.getElementById("gameCodeInput");
      const gameCode = gameCodeInput.value.trim();
      if (gameCode) {
        const userId = uuidv4();
        console.log(
          `[main.js/joinGameSubmitButton.click] Game code: ${gameCode}, UUID: ${userId}`,
        );
        socket.emit("joinGame", { gameCode, userId });
      }
    });
  }

  if (startGameButton) {
    startGameButton.addEventListener("click", () => {
      console.log("[main.js/startGameButton.click] Start Game button clicked");
      const gameCode = localStorage.getItem("gameCode");
      const userId = localStorage.getItem("userId");
      if (gameCode && userId) {
        console.log(
          `[main.js/startGameButton.click] Starting game for game code: ${gameCode}, User ID: ${userId}`,
        );
        socket.emit("startGame", { gameCode, userId });
      }
    });
  }

  if (lockButton) {
    lockButton.addEventListener("click", () => {
      console.log("[main.js/lockButton.click] Lock button clicked");
      const gameCode = localStorage.getItem("gameCode");
      const userId = localStorage.getItem("userId");
      if (!gameCode) {
        console.error(
          "[main.js/lockButton.click] Error: No game code found in local storage",
        );
        return;
      }
      const rankings = getRankings();
      if (gameCode && userId) {
        console.log(
          `[main.js/lockButton.click] Locking rankings for game code: ${gameCode}, User ID: ${userId}`,
        );
        socket.emit("lockRankings", { gameCode, userId, rankings });

        // Hide the game screen and show the waiting screen
        hideElement("game");
        showElement("waitingForVotes");
        updateTextContent(
          "waitingVotesText",
          "Waiting for other players to vote...",
        );
      }
    });
  }

  console.log("[main.js/initializeEventListeners] Event listeners set up");
}

socket.on("gameJoined", ({ gameCode, names, playersCount }) => {
  console.log(
    `[main.js/socket.on('gameJoined')] Game joined: ${gameCode}, Players: ${playersCount}`,
  );
  localStorage.setItem("gameCode", gameCode);
  hideElement("createGame");
  showElement("waitingRoom");
  updateTextContent("waitingRoomGameCode", gameCode);
  updatePlayersList(names);
  const invitationText = `Hey player, help me Force Rank ${names.join(
    ", ",
  )}. Go to http://forcerank.replit.app/?gameid=${gameCode}`;
  document.getElementById("invitationText").value = invitationText;
  console.log(
    `[main.js/socket.on('gameJoined')] Updated waiting room with game code and player list`,
  );
});

socket.on("refreshRanking", ({ names, rankingCriteria }) => {
  console.log(
    `[main.js/socket.on('refreshRanking')] Refreshing ranking for new round`,
  );
  hideElement("result");
  showElement("game");
  updateTextContent("topLabel", rankingCriteria[1]);
  updateTextContent("bottomLabel", rankingCriteria[2]);
  initializeSortableList(names);
});

function handleNameInput(inputElement) {
  console.log(`[main.js/handleNameInput] Input changed: ${inputElement.value}`);
  const nameInputs = document.querySelectorAll(".nameInput");
  const lastInput = nameInputs[nameInputs.length - 1];

  if (inputElement === lastInput && inputElement.value.trim() !== "") {
    addNewNameInput();
  }
}

function addNewNameInput() {
  console.log("[main.js/addNewNameInput] Adding new name input");
  const nameInputsContainer = document.getElementById("nameInputs");
  const newInput = document.createElement("input");
  newInput.type = "text";
  newInput.className = "nameInput";
  newInput.placeholder = "Enter name";
  nameInputsContainer.appendChild(newInput);
}

function getValidNames() {
  const nameInputs = document.querySelectorAll(".nameInput");
  const names = Array.from(nameInputs)
    .map((input) => input.value.trim())
    .filter((name) => name !== "");
  console.log(`[main.js/getValidNames] Valid names: ${names.join(", ")}`);
  return names;
}

function generateGameCode() {
  const code = Math.random().toString(36).substring(2, 7).toUpperCase();
  console.log(`[main.js/generateGameCode] Generated game code: ${code}`);
  return code;
}

function initializeUser() {
  return new Promise((resolve, reject) => {
    let userId = localStorage.getItem("userId");
    let gameCode = localStorage.getItem("gameCode");
    console.log(
      `[main.js/initializeUser] Checking for existing UUID: ${userId} and gameCode: ${gameCode}`,
    );

    if (userId) {
      console.log(
        `[main.js/initializeUser] Found existing UUID in local storage: ${userId}`,
      );
      checkUserAndGame(userId, gameCode)
        .then(({ userExists, gameExists, gameState }) => {
          if (!userExists) {
            userId = generateNewUserId();
            console.log(
              `[main.js/initializeUser] Generated new UUID: ${userId}`,
            );
          }
          if (!gameExists) {
            localStorage.removeItem("gameCode");
            gameCode = null;
          }
          resolve({ userId, gameCode, gameState });
        })
        .catch(reject);
    } else {
      userId = generateNewUserId();
      console.log(`[main.js/initializeUser] Generated new UUID: ${userId}`);
      writeUserToFirebase(userId)
        .then(() => resolve({ userId, gameCode: null, gameState: null }))
        .catch(reject);
    }
  });
}

function checkUserAndGame(userId, gameCode) {
  return fetch(`/checkUserAndGame/${userId}/${gameCode || "noGame"}`)
    .then((response) => response.json())
    .then((data) => data)
    .catch((error) => {
      console.error("[main.js/checkUserAndGame] Error:", error);
      return { userExists: false, gameExists: false, gameState: null };
    });
}

function generateNewUserId() {
  const newUserId = uuidv4();
  localStorage.setItem("userId", newUserId);
  return newUserId;
}

function checkUserInFirebase(userId) {
  return fetch(`/checkUser/${userId}`)
    .then((response) => response.json())
    .then((data) => data.exists)
    .catch((error) => {
      console.error("[main.js/checkUserInFirebase] Error:", error);
      return false;
    });
}

function writeUserToFirebase(userId) {
  return fetch("/writeUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId }),
  })
    .then((response) => response.text())
    .then((data) => {
      console.log(`[main.js/writeUserToFirebase] Server response: ${data}`);
      socket.emit("initUser", { userId });
    });
}

window.addEventListener("load", () => {
  console.log("[main.js/load] Page load event triggered");

  initializeUser()
    .then(({ userId, gameCode, gameState }) => {
      console.log(
        `[main.js/load] Initialized userId: ${userId}, gameCode: ${gameCode}, gameState: ${gameState}`,
      );

      if (gameCode && gameState) {
        console.log(`[main.js/load] Rejoining existing game: ${gameCode}`);
        socket.emit("rejoinGame", { gameCode, userId });
      } else {
        console.log(
          "[main.js/load] No active game found. Showing start screen.",
        );
        showElement("start");
      }

      initializeEventListeners();
    })
    .catch((error) => {
      console.error("[main.js/load] Error initializing user:", error);
      showElement("start");
    });
});

socket.on("updateLockCount", ({ lockedCount, playersCount }) => {
  console.log(
    `[main.js/socket.on('updateLockCount')] Lock count updated: ${lockedCount}/${playersCount}`,
  );
  updateTextContent(
    "waitingVotesText",
    `${lockedCount}/${playersCount} votes placed`,
  );
});

socket.on("playerJoined", ({ gameCode, names, playersCount }) => {
  console.log(
    `[main.js/socket.on('playerJoined')] Player joined game: ${gameCode}, Total players: ${playersCount}`,
  );
  updatePlayersList(names);
  updateTextContent("waitingRoomGameCode", gameCode);
  showElement("waitingRoom");
});

socket.on("startGame", ({ gameCode, names, rankingTerm, playersCount }) => {
  initializeGame(gameCode, names, rankingTerm, playersCount);
});

function displayFinalResults(finalResults, personalRankings, rankingTerm) {
  hideElement("game");
  showElement("result");
  updateTextContent("resultLabel", `Results for: Most ${rankingTerm}`);

  const finalResultsContainer = document.getElementById("finalResults");
  finalResultsContainer.innerHTML = finalResults
    .map((result, index) => {
      const personalRank = personalRankings.find((r) => r.name === result.name);
      return `
            <div class="result-row">
                <div class="result-rank">${index + 1}</div>
                <div class="result-group">${result.name}</div>
                <div class="result-personal">${personalRank ? personalRank.name : "N/A"}</div>
            </div>
        `;
    })
    .join("");
}

socket.on(
  "gameExists",
  ({
    exists,
    userExists,
    gameCode,
    userId,
    state,
    names,
    playersCount,
    rankingCriteria,
  }) => {
    console.log(
      `[main.js/socket.on('gameExists')] Game exists: ${exists}, User exists: ${userExists}, Game state: ${state}`,
    );
    if (exists && userExists) {
      if (state === "waiting") {
        console.log(
          `[main.js/socket.on('gameExists')] Rejoining waiting room for game: ${gameCode}`,
        );
        hideElement("start");
        showElement("waitingRoom");
        updateTextContent("waitingRoomGameCode", gameCode);
        updatePlayersList(names, playersCount);
      } else if (state === "voting") {
        console.log(
          `[main.js/socket.on('gameExists')] Rejoining active game: ${gameCode}`,
        );
        socket.emit("rejoinGame", { gameCode, userId });
      }
    } else {
      console.log(
        "[main.js/socket.on('gameExists')] No active game found. Showing start screen.",
      );
      showElement("start");
    }
  },
);

socket.on(
  "joinedWaitingRoom",
  ({ gameCode, names, playersCount, isCreator }) => {
    console.log(
      `[main.js/socket.on('joinedWaitingRoom')] Joined waiting room for game: ${gameCode}`,
    );
    localStorage.setItem("gameCode", gameCode);
    hideElement("start");
    hideElement("createGame");
    hideElement("joinGame");
    showElement("waitingRoom");
    updateTextContent("waitingRoomGameCode", gameCode);
    updatePlayersList(names);

    const startGameButton = document.getElementById("startGameButton");
    if (startGameButton) {
      startGameButton.style.display = isCreator ? "block" : "none";
    }
  },
);

socket.on("startNewRound", ({ names, rankingCriteria }) => {
  console.log(
    `[main.js/socket.on('startNewRound')] Starting new round with criteria: ${rankingCriteria}`,
  );
  hideElement("result");
  showElement("game");
  updateTextContent("rankingLabel", `Who is the most ${rankingCriteria}?`);
  initializeSortableList(names);
});

console.log("[main.js] Script execution completed");
