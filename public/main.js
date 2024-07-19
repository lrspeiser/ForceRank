import {
  hideElement,
  showElement,
  updateTextContent,
  updatePlayersList,
} from "./domUtils.js";
import {
  getUserId,
  setCreatorStatus,
  getCreatorStatus,
} from "./uuidManager.js";

console.log("[main.js] Import statements executed");

const socket = io();
console.log("[main.js] Socket initialized");

export function getRankings() {
  const sortableItems = document.querySelectorAll("#sortable li");
  return Array.from(sortableItems).map((item, index) => ({
    name: item.textContent,
    rank: index + 1,
  }));
}

function logLocalStorageContents() {
  console.log("[main.js/logLocalStorageContents] Contents of local storage:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`[main.js/logLocalStorageContents] ${key}: ${value}`);
  }
  if (localStorage.length === 0) {
    console.log("[main.js/logLocalStorageContents] Local storage is empty");
  }
}

function updateInvitationText(gameCode, names) {
  const invitationText = `Hey player, help me Force Rank ${names.join(
    ", ",
  )}. Go to http://force.is/?gameid=${gameCode}`;
  const invitationTextElement = document.getElementById("invitationText");
  if (invitationTextElement) {
    invitationTextElement.value = invitationText;
    console.log(
      `[main.js/updateInvitationText] Updated invitation text for game: ${gameCode}`,
    );
  } else {
    console.error(
      "[main.js/updateInvitationText] Invitation text element not found",
    );
  }
}

const endGameButton = document.getElementById("endGameButton");
const stopWaitingButton = document.getElementById("stopWaitingButton");

if (endGameButton) {
  endGameButton.addEventListener("click", () => {
    console.log("[main.js/endGameButton.click] End Game button clicked");
    const gameCode = localStorage.getItem("gameCode");
    const userId = localStorage.getItem("userId");
    if (gameCode && userId) {
      console.log(`[main.js/endGameButton.click] Ending game: ${gameCode}`);
      socket.emit("endGame", { gameCode, userId });
    }
  });
}

if (stopWaitingButton) {
  stopWaitingButton.addEventListener("click", () => {
    console.log(
      "[main.js/stopWaitingButton.click] Stop Waiting button clicked",
    );
    const gameCode = localStorage.getItem("gameCode");
    const userId = localStorage.getItem("userId");
    if (gameCode && userId) {
      console.log(
        `[main.js/stopWaitingButton.click] Stopping wait for game: ${gameCode}`,
      );
      socket.emit("stopWaiting", { gameCode, userId });
    }
  });
}

function determineCreatorStatus(creator) {
  const userId = localStorage.getItem("userId");
  const isCreator = userId === creator;
  setCreatorStatus(isCreator);
  return isCreator;
}

socket.on("clearLocalStorage", () => {
    console.log("[main.js/socket.on('clearLocalStorage')] Clearing local storage");
    localStorage.removeItem("gameCode");
    setCreatorStatus(false);
});

socket.on("updateLockCount", ({ lockedCount, playersCount, creator }) => {
  console.log(
    `[main.js/socket.on('updateLockCount')] Lock count updated: ${lockedCount}/${playersCount}`,
  );
  updateTextContent(
    "waitingVotesText",
    `${lockedCount}/${playersCount} votes placed`,
  );

  const stopWaitingButton = document.getElementById("stopWaitingButton");
  const isCreator = determineCreatorStatus(creator);

  if (stopWaitingButton) {
    stopWaitingButton.style.display = isCreator ? "block" : "none";
    console.log(
      `[main.js/socket.on('updateLockCount')] Stop Waiting button display: ${stopWaitingButton.style.display}`,
    );
  } else {
    console.error(
      "[main.js/socket.on('updateLockCount')] Stop Waiting button element not found",
    );
  }
});

socket.on(
  "displayFinalResults",
  ({ groupRanking, playerVotes, rankingTerm, creator }) => {
    console.log(
      "[main.js/socket.on('displayFinalResults')] Displaying final results",
      { groupRanking, playerVotes, rankingTerm, creator },
    );
    hideElement("game");
    hideElement("waitingForVotes");
    showElement("result");
    const userId = localStorage.getItem("userId");
    const userVotes =
      playerVotes && playerVotes[userId] ? playerVotes[userId] : [];
    const resultTable = document.getElementById("resultTable");
    if (resultTable) {
      if (groupRanking && groupRanking.length > 0) {
        resultTable.innerHTML = `
          <tr>
              <th>Rank</th>
              <th>Group Vote</th>
              <th>Your Vote</th>
          </tr>
          ${groupRanking
            .map(({ name, rank }) => {
              const userVote = userVotes.find((vote) => vote.name === name) || {
                rank: "N/A",
              };
              return `
                  <tr>
                      <td>${rank}</td>
                      <td>${name}</td>
                      <td>${userVote.rank}</td>
                  </tr>
              `;
            })
            .join("")}
        `;
      } else {
        resultTable.innerHTML =
          "<tr><td colspan='3'>No results available</td></tr>";
      }
    } else {
      console.error(
        "[main.js/socket.on('displayFinalResults')] Result table element not found",
      );
    }
    updateTextContent("resultLabel", `Final Results for: Most ${rankingTerm}`);
    // Show next button and end game button only for the creator
    const nextButton = document.getElementById("nextButton");
    const endGameButton = document.getElementById("endGameButton");
    const isCreator = determineCreatorStatus(creator);
    console.log(
      `[main.js/socket.on('displayFinalResults')] Is creator: ${isCreator}`,
    );
    if (nextButton && endGameButton) {
      nextButton.style.display = isCreator ? "block" : "none";
      endGameButton.style.display = isCreator ? "block" : "none";

      console.log(
        `[main.js/socket.on('displayFinalResults')] Next button display: ${nextButton.style.display}`,
      );
      console.log(
        `[main.js/socket.on('displayFinalResults')] End Game button display: ${endGameButton.style.display}`,
      );
    } else {
      console.error(
        "[main.js/socket.on('displayFinalResults')] Next button or End Game button element not found",
      );
    }
    // Update creator status in local storage
    setCreatorStatus(isCreator);
  },
);

function initializeEventListeners() {
  console.log("[main.js/initializeEventListeners] Setting up event listeners");

  const createGameButton = document.getElementById("createGameButton");
  const joinGameButton = document.getElementById("joinGameButton");
  const submitNamesButton = document.getElementById("submitNamesButton");
  const joinGameSubmitButton = document.getElementById("joinGameSubmitButton");
  const startGameButton = document.getElementById("startGameButton");
  const lockButton = document.getElementById("lockButton");
  const createGameDiv = document.getElementById("createGame");
  const nextButton = document.getElementById("nextButton");

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      console.log("[main.js/nextButton.click] Next button clicked");
      const gameCode = localStorage.getItem("gameCode");
      const userId = localStorage.getItem("userId");
      if (gameCode && userId) {
        console.log(
          `[main.js/nextButton.click] Requesting next round for game code: ${gameCode}, userId: ${userId}`,
        );
        socket.emit("nextRanking", { gameCode, userId });
      } else {
        console.error(
          "[main.js/nextButton.click] Game code or user ID not found in local storage",
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
      const names = getValidNames();
      if (names.length >= 2) {
        const gameCode = generateGameCode();
        const userId = localStorage.getItem("userId");
        localStorage.setItem("gameCode", gameCode);
        setCreatorStatus(true); // Set creator status to true
        console.log(
          `[main.js/submitNamesButton.click] Game code: ${gameCode}, Names: ${names.join(", ")}, UUID: ${userId}, isCreator: true`,
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
      const gameCode = gameCodeInput.value.trim();
      if (gameCode) {
        const userId = localStorage.getItem("userId");
        localStorage.setItem("gameCode", gameCode);
        setCreatorStatus(false); // Set creator status to false
        console.log(
          `[main.js/joinGameSubmitButton.click] Game code: ${gameCode}, UUID: ${userId}, isCreator: false`,
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

function initializeSortableList(names) {
  const sortableList = document.getElementById("sortable");
  if (sortableList) {
    // Destroy existing Sortable instance if it exists
    if (sortableList.sortable) {
      sortableList.sortable.destroy();
    }

    // Reinitialize the list
    sortableList.innerHTML = names
      .map((name) => `<li class="sortable-item">${name}</li>`)
      .join("");

    // Reinitialize Sortable
    new Sortable(sortableList, {
      animation: 150,
      ghostClass: "sortable-ghost",
      touchStartThreshold: 5, // Add this line
      delayOnTouchOnly: true, // Add this line
      delay: 100, // Add this line
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
  } else {
    console.error(
      "[main.js/initializeSortableList] Sortable list element not found",
    );
  }
}

function reinitializeGameScreen(names, rankingTerm) {
  hideElement("waitingRoom");
  hideElement("result");
  showElement("game");
  updateTextContent("rankingLabel", `Who is the most ${rankingTerm}?`);
  initializeSortableList(names);
}

socket.on("gameEnded", () => {
    console.log("[main.js/socket.on('gameEnded')] Game has ended");
    localStorage.removeItem("gameCode");
    setCreatorStatus(false);
    hideElement("result");
    hideElement("waitingForVotes");
    hideElement("game");
    hideElement("waitingRoom");
    showElement("start");
});

socket.on("playerJoined", ({ gameCode, names, playersCount }) => {
    console.log(
        `[main.js/socket.on('playerJoined')] Player joined game: ${gameCode}, Total players: ${playersCount}`,
    );
    updatePlayersList(names);
    updateTextContent("waitingRoomGameCode", gameCode);
    showElement("waitingRoom");
});

socket.on("startGame", ({ gameCode, names, rankingTerm, playersCount, creator }) => {
    console.log(
        `[main.js/socket.on('startGame')] Starting game for game code: ${gameCode}`,
        { names, rankingTerm, playersCount, creator },
    );
    localStorage.setItem("gameCode", gameCode);
    hideElement("waitingRoom");
    showElement("game");
    updateTextContent("rankingLabel", `Who is the most ${rankingTerm}?`);

    initializeSortableList(names);

    // Determine if the current user is the creator
    const userId = localStorage.getItem("userId");
    const isCreator = userId === creator;
    setCreatorStatus(isCreator);

    // Update the UI based on whether the user is the creator or not
    const nextButton = document.getElementById("nextButton");
    const endGameButton = document.getElementById("endGameButton");
    if (nextButton && endGameButton) {
        nextButton.style.display = isCreator ? "block" : "none";
        endGameButton.style.display = isCreator ? "block" : "none";
    }
});

socket.on("startNewRound", ({ names, rankingTerm }) => {
  console.log(
    `[main.js/socket.on('startNewRound')] Starting new round with term: ${rankingTerm}`,
  );
  hideElement("result");
  showElement("game");
  updateTextContent("rankingLabel", `Who is the most ${rankingTerm}?`);

  initializeSortableList(names);

  // Reset lock count
  updateTextContent("lockCount", "0 / X votes cast");
});

socket.on("gameJoined", ({ gameCode, names, playersCount }) => {
  console.log(
    `[main.js/socket.on('gameJoined')] Game joined: ${gameCode}, Players: ${playersCount}`,
  );
  localStorage.setItem("gameCode", gameCode);
  hideElement("createGame");
  showElement("waitingRoom");
  updateTextContent("waitingRoomGameCode", gameCode);
  updatePlayersList(names);
  updateInvitationText(gameCode, names);
  console.log(
    `[main.js/socket.on('gameJoined')] Updated waiting room with game code and player list`,
  );
});

socket.on("refreshRanking", ({ names, rankingTerm }) => {
  console.log(
    `[main.js/socket.on('refreshRanking')] Refreshing ranking for new round`,
    { names, rankingTerm },
  );
  hideElement("result");
  showElement("game");
  updateTextContent("rankingLabel", `Who is the most ${rankingTerm}?`);

  initializeSortableList(names);

  updateTextContent("lockCount", "0 / X votes cast");
});

socket.on("joinedWaitingRoom", ({ gameCode, names, playersCount, isCreator }) => {
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
    updateInvitationText(gameCode, names);

    setCreatorStatus(isCreator);

    const startGameButton = document.getElementById("startGameButton");
    if (startGameButton) {
        startGameButton.style.display = isCreator ? "block" : "none";
    }

    console.log(`[main.js/socket.on('joinedWaitingRoom')] Updated waiting room. Is creator: ${isCreator}`);
});

socket.on("rejoinVoting", ({ gameCode, names, rankingTerm, playersCount }) => {
  console.log(
    `[main.js/socket.on('rejoinVoting')] Rejoining voting for game code: ${gameCode}`,
    { names, rankingTerm, playersCount },
  );
  reinitializeGameScreen(names, rankingTerm);
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

async function initializeUser() {
  let userId = localStorage.getItem("userId");
  console.log(`[main.js/initializeUser] Using UUID: ${userId}`);

  if (!userId) {
    userId = generateNewUserId();
    localStorage.setItem("userId", userId);
    console.log(`[main.js/initializeUser] Generated new UUID: ${userId}`);
  }

  try {
    const response = await fetch(`/initUser/${userId}`);
    const data = await response.json();
    if (!data.success) {
      console.error(
        `[main.js/initializeUser] Failed to initialize user: ${data.error}`,
      );
    } else {
      console.log(
        `[main.js/initializeUser] User initialized successfully: ${userId}`,
      );
    }
  } catch (error) {
    console.error(`[main.js/initializeUser] Error initializing user: ${error}`);
  }

  return userId;
}

function generateNewUserId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    var r = (Math.random() * 16) | 0,
      v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function handlePageRefresh() {
  const userId = await getUserId();
  const gameCode = localStorage.getItem("gameCode");
  const isCreator = getCreatorStatus();

  // Hide all screens initially
  hideElement("start");
  hideElement("createGame");
  hideElement("joinGame");
  hideElement("waitingRoom");
  hideElement("game");
  hideElement("waitingForVotes");
  hideElement("result");

  if (!userId || !gameCode) {
    console.log(
      "[main.js/handlePageRefresh] No userId or gameCode found in localStorage. Showing start screen.",
    );
    localStorage.removeItem("gameCode");
    setCreatorStatus(false);
    showElement("start");
    return;
  }

  const gameExists = await checkGameExists(gameCode);
  if (!gameExists) {
    console.log(
      `[main.js/handlePageRefresh] Game ${gameCode} does not exist. Removing from localStorage and showing start screen.`,
    );
    localStorage.removeItem("gameCode");
    setCreatorStatus(false); // Reset creator status
    showElement("start");
    return;
  }

  console.log(
    `[main.js/handlePageRefresh] Checking game state for user ${userId} in game ${gameCode}`,
  );
  console.log(`[main.js/handlePageRefresh] Is creator: ${isCreator}`);

  try {
    const response = await fetch(`/checkUserAndGame/${userId}/${gameCode}`);
    const data = await response.json();

    if (!data.userExists || !data.gameExists) {
      console.log(
        `[main.js/handlePageRefresh] User or game not found. Clearing localStorage and showing start screen.`,
      );
      localStorage.removeItem("gameCode");
      setCreatorStatus(false);
      showElement("start");
      return;
    }

    console.log(`[main.js/handlePageRefresh] Game state: ${data.gameState}`);

    switch (data.gameState) {
      case "waiting":
        console.log("[main.js/handlePageRefresh] Showing waiting room");
        showElement("waitingRoom");
        socket.emit("rejoinGame", { gameCode, userId, isCreator });
        break;
      case "voting":
        console.log("[main.js/handlePageRefresh] Showing voting screen");
        showElement("game");
        socket.emit("rejoinGame", { gameCode, userId, isCreator });
        break;
      case "waitingForVotes":
        console.log(
          "[main.js/handlePageRefresh] Showing waiting for votes screen",
        );
        showElement("waitingForVotes");
        socket.emit("rejoinGame", { gameCode, userId, isCreator });
        break;
      case "completed":
        console.log("[main.js/handlePageRefresh] Showing results screen");
        showElement("result");
        socket.emit("rejoinGame", { gameCode, userId, isCreator });

        // Update buttons visibility based on creator status
        const nextButton = document.getElementById("nextButton");
        const endGameButton = document.getElementById("endGameButton");
        if (nextButton && endGameButton) {
          nextButton.style.display = isCreator ? "block" : "none";
          endGameButton.style.display = isCreator ? "block" : "none";
        }
        break;
      default:
        console.log(
          "[main.js/handlePageRefresh] Unknown game state. Showing start screen.",
        );
        localStorage.removeItem("gameCode");
        setCreatorStatus(false);
        showElement("start");
        break;
    }
  } catch (error) {
    console.error(
      `[main.js/handlePageRefresh] Error checking user and game: ${error}`,
    );
    localStorage.removeItem("gameCode");
    setCreatorStatus(false);
    showElement("start");
  }
}

async function checkGameExists(gameCode) {
  try {
    const response = await fetch(`/checkGameExists/${gameCode}`);
    const data = await response.json();
    console.log(
      `[main.js/checkGameExists] Game ${gameCode} exists: ${data.exists}`,
    );
    return data.exists;
  } catch (error) {
    console.error(`[main.js/checkGameExists] Error checking game: ${error}`);
    return false;
  }
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



document.addEventListener("DOMContentLoaded", async () => {
  console.log("[main.js/DOMContentLoaded] Document is ready");
  logLocalStorageContents();
  const userId = await initializeUser();
  console.log(`[main.js/DOMContentLoaded] Initialized user: ${userId}`);
  initializeEventListeners();
  handlePageRefresh();
});
