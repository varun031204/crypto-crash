require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const apiRoutes = require('./routes/api');
const gameService = require('./services/gameService');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(require('path').join(__dirname, 'test')));
app.use('/api', apiRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// WebSocket handling
io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);
  
  // Send current game state
  socket.emit('gameState', gameService.getGameState());

  // Handle cashout via WebSocket
  socket.on('cashout', async (data) => {
    try {
      const result = await gameService.cashOut(data.playerId);
      socket.emit('cashoutSuccess', result);
      io.emit('playerCashout', {
        playerId: data.playerId,
        multiplier: result.multiplier,
        payout: result.payout,
        usdValue: result.usdValue
      });
    } catch (error) {
      socket.emit('cashoutError', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
  });
});

// Game loop
async function runGameLoop() {
  while (true) {
    // Waiting phase - 10 seconds for bets
    gameService.gameState = 'waiting';
    await gameService.prepareRound();
    io.emit('gameState', gameService.getGameState());
    await sleep(10000);

    // Active phase - start round
    await gameService.startNewRound();
    io.emit('roundStart', gameService.getGameState());

    // Multiplier updates until crash
    await new Promise((resolve) => {
      const multiplierInterval = setInterval(() => {
        const multiplier = gameService.getCurrentMultiplier();
        const crashPoint = gameService.crashPoint;

        if (multiplier >= crashPoint) {
          clearInterval(multiplierInterval);
          gameService.endRound().then(() => {
            io.emit('roundCrash', { crashPoint, finalMultiplier: multiplier });
            resolve();
          });
        } else {
          io.emit('multiplierUpdate', { multiplier });
        }
      }, 100);
    });

    // Cooldown before next round
    await sleep(3000);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  runGameLoop();
});

module.exports = { app, server, io };