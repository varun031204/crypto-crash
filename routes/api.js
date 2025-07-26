const express = require('express');
const Player = require('../models/Player');
const gameService = require('../services/gameService');
const cryptoService = require('../services/cryptoService');
const router = express.Router();

// Get player wallet balance
router.get('/wallet/:playerId', async (req, res) => {
  try {
    const player = await Player.findOne({ playerId: req.params.playerId });
    if (!player) return res.status(404).json({ error: 'Player not found' });

    const balances = await Promise.all(
      player.wallets.map(async (wallet) => {
        const price = await cryptoService.getPrice(wallet.currency);
        return {
          currency: wallet.currency,
          balance: wallet.balance,
          usdValue: cryptoService.convertCryptoToUsd(wallet.balance, price)
        };
      })
    );

    res.json({ playerId: player.playerId, balances });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Place bet
router.post('/bet', async (req, res) => {
  try {
    const { playerId, usdAmount, currency } = req.body;
    
    if (!playerId || !usdAmount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (usdAmount <= 0) {
      return res.status(400).json({ error: 'Invalid bet amount' });
    }

    const result = await gameService.placeBet(playerId, usdAmount, currency);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Cash out
router.post('/cashout', async (req, res) => {
  try {
    const { playerId } = req.body;
    
    if (!playerId) {
      return res.status(400).json({ error: 'Player ID required' });
    }

    const result = await gameService.cashOut(playerId);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get game state
router.get('/game/state', (req, res) => {
  res.json(gameService.getGameState());
});

// Get crypto prices
router.get('/prices/:currency', async (req, res) => {
  try {
    const price = await cryptoService.getPrice(req.params.currency);
    res.json({ currency: req.params.currency, price });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;