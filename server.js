const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const port = 3000;

app.use(express.static(__dirname + '/public'));

let secretNumber;
const players = new Map(); // Map pour stocker les noms des joueurs
let currentPlayer = null; // Variable pour suivre le joueur actuel
let isWaiting = true; // Variable pour indiquer si un joueur attend

function startGame() {
  secretNumber = Math.floor(Math.random() * 100) + 1;
  io.sockets.emit('message', 'Nouveau jeu !');
  io.sockets.emit('message', 'Devinez le nombre entre 1 et 100.');
  isWaiting = false;
  assignCurrentPlayer();
  io.sockets.emit('currentPlayer', currentPlayer);
}

function assignCurrentPlayer() {
  const playerArray = Array.from(players.values());
  if (playerArray.length > 0) {
    const currentIndex = playerArray.indexOf(currentPlayer);
    const nextIndex = (currentIndex + 1) % playerArray.length;
    currentPlayer = playerArray[nextIndex];
  } else {
    currentPlayer = null;
  }
}

io.on('connection', (socket) => {
  startGame();

  socket.on('join', (playerName) => {
    players.set(socket.id, playerName);
    console.log(`${playerName} a rejoint la partie.`);
    io.sockets.emit('message', `${playerName} a rejoint la partie.`);
    
    if (currentPlayer === null) {
      assignCurrentPlayer();
      io.sockets.emit('currentPlayer', currentPlayer);
    }
  });

  socket.on('guess', (guess, playerName) => {
    if (isWaiting) {
      socket.emit('message', 'Attendez que l autre joueur termine son tour.');
      return;
    }

    if (currentPlayer === playerName) {
      if (guess === secretNumber) {
        io.sockets.emit('message', `Félicitations, ${playerName} ! ${guess} est le bon nombre.`);
        isWaiting = true;
        startGame();
      } else if (guess < secretNumber) {
        io.sockets.emit('message', `${playerName}, essayez un nombre plus grand que ${guess}.`);
      } else {
        io.sockets.emit('message', `${playerName}, essayez un nombre plus petit que ${guess}.`);
      }

      assignCurrentPlayer();
      io.sockets.emit('currentPlayer', currentPlayer);
    } else {
      socket.emit('message', 'Ce n\'est pas votre tour de jouer.');
    }
  });

  socket.on('disconnect', () => {
    const playerName = players.get(socket.id);
    if (playerName) {
      players.delete(socket.id);
      console.log(`${playerName} a quitté la partie.`);
      io.sockets.emit('message', `${playerName} a quitté la partie.`);
      if (currentPlayer === playerName) {
        assignCurrentPlayer();
        io.sockets.emit('currentPlayer', currentPlayer);
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
});
