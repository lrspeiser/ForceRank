# ForceRank Game

Welcome to ForceRank, a fun and interactive ranking game designed to help you and your friends rank items based on specific criteria. This game was created with the assistance of large language models (LLMs) and is accessible via [force.is](http://force.is). We welcome your feedback to improve the game further.

## About the Game

ForceRank is a multiplayer game where players rank a set of items based on given criteria. The game is played in rounds, and players' rankings are combined to determine a final ranking. It's a great way to engage in friendly debates and see how your opinions compare to others.

## Features

- **Multiplayer Mode**: Play with your friends and see how your rankings compare.
- **Dynamic Criteria**: Each game can have different ranking criteria, keeping the game fresh and engaging.
- **Real-Time Updates**: Rankings are updated in real-time, allowing for a seamless gaming experience.

## Access the Game

You can access and play ForceRank at [force.is](http://force.is). 

## Feedback

We welcome your feedback! Please let us know what you think about the game and any improvements you would like to see. You can submit feedback through the contact form on our website or by opening an issue in this GitHub repository.

## Architecture and Technology Choices

### Backend

- **Node.js**: The backend is built using Node.js, providing a robust and scalable environment for handling real-time interactions.
- **Firebase**: Firebase is used for real-time database and authentication, ensuring that the game state is consistently synchronized across all clients.
- **Express**: Express is used to create a web server that serves static files and handles API endpoints.
- **Socket.io**: Socket.io manages real-time communication between the server and clients, ensuring instant updates for all players.

### Frontend

- **HTML/CSS/JavaScript**: The game interface is created using standard web technologies, ensuring broad compatibility and a responsive user experience.
- **Sortable.js**: This library is used for drag-and-drop functionality, allowing players to easily rank items by dragging them into place.

### Game Logic

The game logic is designed to handle multiple players, manage game states, and ensure fair play. Here's a brief overview of the key components:

- **Game Initialization**: When a game is created, players join by entering a game code. The game starts when all players are ready.
- **Ranking**: Players rank items based on the given criteria. Rankings are updated in real-time and stored in Firebase.
- **Scoring**: Once all players have locked in their rankings, the game calculates the final scores and determines the overall ranking.

#### Detailed Game Logic

- **Game State Management**: The game transitions between different states such as waiting, voting, and completed. These states are managed in Firebase and updated in real-time.
- **Player Actions**: Players can create games, join existing games, and submit their rankings. Each action triggers updates in the game state and informs all connected clients.
- **Ranking Calculations**: Rankings are calculated based on player inputs, and final results are determined by aggregating scores across all players.
- **Demo Mode**: The game includes a demo mode where players can join and experience the game without affecting live game data.

## Contributing

We welcome contributions from the community. If you would like to contribute, please fork the repository, make your changes, and submit a pull request. Be sure to follow our coding standards and include detailed descriptions of your changes.

## License

This project is licensed under the MIT License. See the LICENSE file for details.

## Acknowledgments

This game was created with the assistance of large language models (LLMs), which provided valuable insights and suggestions throughout the development process.

---

Thank you for checking out ForceRank! We hope you enjoy playing the game as much as we enjoyed creating it. Your feedback and contributions are greatly appreciated.
