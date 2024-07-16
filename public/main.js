// main.js - do not remove this header or any log statements

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

socket.on("displayFinalResults", ({ finalResults, rankingCriteria }) => {
  console.log(
    `[main.js/socket.on('displayFinalResults')] Displaying final results for game code: ${gameCode}`,
  );
  console.log(
    `[main.js/socket.on('displayFinalResults')] Final results: ${JSON.stringify(finalResults)}`,
  );
  console.log(
    `[main.js/socket.on('displayFinalResults')] Ranking criteria: ${JSON.stringify(rankingCriteria)}`,
  );
  updateFinalResults(finalResults, rankingCriteria);
});

function updateFinalResults(finalResults, rankingCriteria) {
  console.log(
    `[main.js/updateFinalResults] Called with finalResults: ${JSON.stringify(finalResults)}, rankingCriteria: ${JSON.stringify(rankingCriteria)}`,
  );
  const finalResultsElement = document.getElementById("finalResults");
  if (finalResultsElement) {
    finalResultsElement.innerHTML = finalResults
      .map((result) => `<li>${result.name} - ${result.rank}</li>`)
      .join("");
    console.log(`[main.js/updateFinalResults] Updated final results display`);
  } else {
    console.log(`[main.js/updateFinalResults] finalResultsElement not found`);
  }

  const rankingCriteriaElement = document.getElementById("rankingCriteria");
  if (rankingCriteriaElement) {
    rankingCriteriaElement.textContent = `Ranking Criteria: ${rankingCriteria.join(", ")}`;
    console.log(
      `[main.js/updateFinalResults] Updated ranking criteria display`,
    );
  } else {
    console.log(
      `[main.js/updateFinalResults] rankingCriteriaElement not found`,
    );
  }
}

socket.on(
  "showWaitingRoom",
  ({ gameCode, lockedCount, playersCount, names }) => {
    console.log(
      `[main.js/socket.on('showWaitingRoom')] Showing waiting room for game code: ${gameCode}`,
    );
    hideElement("game");
    showElement("waitingRoom");
    updatePlayersList(names);
    updateLockCount(lockedCount, playersCount);
  },
);

document.getElementById("startGameButton").addEventListener("click", () => {
  const gameCode = localStorage.getItem("gameCode");
  const userId = localStorage.getItem("userId");

  console.log(`[main.js/startGameButton.click] Click event triggered`);
  console.log(
    `[main.js/startGameButton.click] Retrieved game code from local storage: ${gameCode}`,
  );
  console.log(
    `[main.js/startGameButton.click] Retrieved user ID from local storage: ${userId}`,
  );

  if (gameCode && userId) {
    const url = "/startGame";
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ gameCode, userId }),
    };
    logFetchCall(url, options);
    fetch(url, options)
      .then((response) => {
        if (response.ok) {
          console.log(
            `[main.js/startGameButton.click] Start game request successful`,
          );
        } else {
          console.error(`[main.js/startGameButton.click] Error starting game`);
        }
      })
      .catch((error) => {
        console.error(
          `[main.js/startGameButton.click] Network error starting game: ${error}`,
        );
      });
  } else {
    console.log(
      `[main.js/startGameButton.click] Error: gameCode or userId is missing`,
    );
  }
});

document.getElementById("lockButton").addEventListener("click", () => {
  const gameCode = localStorage.getItem("gameCode");
  const userId = localStorage.getItem("userId");
  const rankings = getRankings();

  console.log(`[main.js/lockButton.click] Click event triggered`);
  console.log(
    `[main.js/lockButton.click] Retrieved game code from local storage: ${gameCode}`,
  );
  console.log(
    `[main.js/lockButton.click] Retrieved user ID from local storage: ${userId}`,
  );
  console.log(
    `[main.js/lockButton.click] Locking in rankings for game code: ${gameCode}, User ID: ${userId}`,
  );
  console.log(
    `[main.js/lockButton.click] Rankings: ${JSON.stringify(rankings)}`,
  );

  const url = "/lockRankings";
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gameCode, userId, rankings }),
  };
  logFetchCall(url, options);
  fetch(url, options)
    .then((response) => {
      if (response.ok) {
        console.log(
          `[main.js/lockButton.click] Lock rankings request successful`,
        );
      } else {
        console.error(`[main.js/lockButton.click] Error locking rankings`);
      }
    })
    .catch((error) => {
      console.error(
        `[main.js/lockButton.click] Network error locking rankings: ${error}`,
      );
    });
});

window.addEventListener("load", () => {
  const gameCode = localStorage.getItem("gameCode");
  let userId = localStorage.getItem("userId");

  console.log(`[main.js/load] Page load event triggered`);
  console.log(`[main.js/load] Initial gameCode: ${gameCode}`);
  console.log(`[main.js/load] Initial userId: ${userId}`);

  if (!userId) {
    userId = uuidv4();
    localStorage.setItem("userId", userId);
    console.log(`[main.js/load] Generated new userId: ${userId}`);
  } else {
    console.log(`[main.js/load] Found existing userId: ${userId}`);
  }

  if (gameCode && userId) {
    console.log(
      `[main.js/load] Checking game state for gameCode: ${gameCode}, userId: ${userId}`,
    );
    console.log(`[main.js/load] UUID check in Firebase for userId: ${userId}`);
    socket.emit("checkGameExists", { gameCode, userId });
  } else {
    console.log(
      `[main.js/load] No gameCode or userId found in local storage. Showing start screen.`,
    );
    showElement("start");
  }
});

socket.on(
  "gameExists",
  ({
    gameExists,
    userExists,
    gameCode,
    userId,
    state,
    names,
    playersCount,
  }) => {
    console.log(
      `[main.js/socket.on('gameExists')] UUID check result for userId: ${userId} - gameExists: ${gameExists}, userExists: ${userExists}`,
    );
    if (gameExists && userExists) {
      console.log(
        `[main.js/socket.on('gameExists')] Game exists: ${gameExists}, User exists: ${userExists}`,
      );
      if (state === "voting") {
        console.log(
          `[main.js/socket.on('gameExists')] Game is in voting state.`,
        );
        hideElement("waitingRoom");
        showElement("game");
        updatePlayersList(names);
      } else if (state === "waiting") {
        console.log(
          `[main.js/socket.on('gameExists')] Game is in waiting state.`,
        );
        hideElement("game");
        showElement("waitingRoom");
        updatePlayersList(names);
      } else if (state === "results") {
        console.log(
          `[main.js/socket.on('gameExists')] Game is in results state.`,
        );
        hideElement("waitingRoom");
        showElement("result");
      }
    } else {
      console.log(
        `[main.js/socket.on('gameExists')] Game or user does not exist. Clearing local storage and showing start screen.`,
      );
      localStorage.removeItem("gameCode");
      localStorage.removeItem("userId");
      localStorage.removeItem("isCreator");
      showElement("start");
    }
  },
);

console.log("[main.js] Script execution completed");
