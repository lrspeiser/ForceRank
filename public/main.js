// main.js

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

  const sortableList = document.getElementById("sortable");
  sortableList.innerHTML = names
    .map((name) => `<li class="sortable-item">${name}</li>`)
    .join("");

  new Sortable(sortable, {
    animation: 150,
    ghostClass: "sortable-ghost",
  });
}

function updateLockCount(lockedCount, playersCount) {
  console.log(
    `[main.js/updateLockCount] Called with lockedCount: ${lockedCount}, playersCount: ${playersCount}`,
  );
  updateTextContent(
    "lockCountText",
    `${lockedCount}/${playersCount} players locked in`,
  );
  console.log(`[main.js/updateLockCount] Updated lockCountText`);
  updateTextContent(
    "waitingVotesText",
    `${lockedCount}/${playersCount} votes placed`,
  );
  console.log(`[main.js/updateLockCount] Updated waitingVotesText`);
  if (lockedCount === playersCount) {
    console.log(
      `[main.js/updateLockCount] All players have locked in their votes. Displaying results...`,
    );
    showFinalResults();
  } else {
    console.log(`[main.js/updateLockCount] Waiting for all votes...`);
  }
}

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
        const userId = uuidv4();
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
      const rankings = getRankings();
      if (gameCode && userId) {
        console.log(
          `[main.js/lockButton.click] Locking rankings for game code: ${gameCode}, User ID: ${userId}`,
        );
        socket.emit("lockRankings", { gameCode, userId, rankings });
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
  const invitationText = `Hey player, help me Force Rank ${names.join(", ")}. Go to http://forcerank.replit.app/?gameid=${gameCode}`;
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
  const sortableList = document.getElementById("sortable");
  sortableList.innerHTML = names
    .map((name) => `<li class="sortable-item">${name}</li>`)
    .join("");
  new Sortable(sortableList, {
    animation: 150,
    ghostClass: "sortable-ghost",
  });
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

function getRankings() {
  const sortableItems = document.querySelectorAll("#sortable .sortable-item");
  return Array.from(sortableItems).map((item, index) => ({
    name: item.textContent,
    rank: index + 1,
  }));
}

window.addEventListener("load", () => {
  console.log("[main.js/load] Page load event triggered");
  const gameCode = localStorage.getItem("gameCode");
  let userId = localStorage.getItem("userId");

  console.log(`[main.js/load] Initial gameCode: ${gameCode}`);
  console.log(`[main.js/load] Initial userId: ${userId}`);

  if (!userId) {
    userId = uuidv4();
    localStorage.setItem("userId", userId);
    console.log(`[main.js/load] Generated new userId: ${userId}`);
  }

  if (gameCode && userId) {
    console.log(
      `[main.js/load] Checking game state for gameCode: ${gameCode}, userId: ${userId}`,
    );
    socket.emit("checkGameExists", { gameCode, userId });
  } else {
    console.log(
      "[main.js/load] No gameCode or userId found in local storage. Showing start screen.",
    );
    showElement("start");
  }

  initializeEventListeners();
});

socket.on("updateLockCount", ({ lockedCount, playersCount }) => {
  console.log(
    `[main.js/socket.on('updateLockCount')] Lock count updated: ${lockedCount}/${playersCount}`,
  );
  updateLockCount(lockedCount, playersCount);

  if (lockedCount === playersCount) {
    console.log(
      `[main.js/socket.on('updateLockCount')] All players have locked in their votes. Fetching final results...`,
    );
    socket.emit("fetchFinalResults", { gameCode });
  }
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

socket.on("displayFinalResults", ({ finalResults, rankingTerm }) => {
  const personalRankings = getRankings();
  displayFinalResults(finalResults, personalRankings, rankingTerm);
});

console.log("[main.js] Script execution completed");
