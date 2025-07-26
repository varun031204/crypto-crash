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
app.use(express.static('test'));
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
let gameInterval;

function startGameLoop() {
  gameInterval = setInterval(async () => {
    const state = gameService.getGameState();
    
    if (state.status === 'waiting') {
      // Start new round every 10 seconds
      await gameService.startNewRound();
      io.emit('roundStart', gameService.getGameState());
      
      // Start multiplier updates
      const multiplierInterval = setInterval(() => {
        const currentState = gameService.getGameState();
        const multiplier = gameService.getCurrentMultiplier();
        
        if (multiplier >= currentState.crashPoint) {
          clearInterval(multiplierInterval);
          gameService.endRound().then(() => {
            io.emit('roundCrash', {
              crashPoint: currentState.crashPoint,
              finalMultiplier: multiplier
            });
          });
        } else {
          io.emit('multiplierUpdate', { multiplier });
        }
      }, process.env.MULTIPLIER_UPDATE_INTERVAL || 100);
      
    }
  }, process.env.GAME_ROUND_DURATION || 10000);
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  startGameLoop();
});

module.exports = { app, server, io };