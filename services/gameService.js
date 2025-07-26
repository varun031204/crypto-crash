const crypto = require('crypto');
const GameRound = require('../models/GameRound');
const Player = require('../models/Player');
const Transaction = require('../models/Transaction');
const cryptoService = require('./cryptoService');

class GameService {
  constructor() {
    this.currentRound = null;
    this.gameState = 'waiting';
    this.multiplier = 1;
    this.startTime = null;
    this.crashPoint = null;
  }

  generateCrashPoint(seed, roundId) {
    const hash = crypto.createHash('sha256').update(seed + roundId).digest('hex');
    const hashInt = parseInt(hash.substring(0, 8), 16);
    const crashPoint = Math.max(1.01, (hashInt % (process.env.MAX_CRASH_MULTIPLIER * 100)) / 100);
    return Math.round(crashPoint * 100) / 100;
  }

  generateSeed() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateHash(seed) {
    return crypto.createHash('sha256').update(seed).digest('hex');
  }

  async startNewRound() {
    const seed = this.generateSeed();
    const roundId = Date.now().toString();
    const hash = this.generateHash(seed);
    const crashPoint = this.generateCrashPoint(seed, roundId);

    this.currentRound = new GameRound({
      roundId,
      seed,
      hash,
      crashPoint,
      startTime: new Date(),
      status: 'active'
    });

    await this.currentRound.save();
    
    this.gameState = 'active';
    this.multiplier = 1;
    this.startTime = Date.now();
    this.crashPoint = crashPoint;

    return this.currentRound;
  }

  getCurrentMultiplier() {
    if (this.gameState !== 'active') return 1;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const growthFactor = 0.1;
    this.multiplier = 1 + (elapsed * growthFactor);
    
    return Math.round(this.multiplier * 100) / 100;
  }

  async placeBet(playerId, usdAmount, currency) {
    if (this.gameState !== 'waiting') {
      throw new Error('Cannot place bet during active round');
    }

    const player = await Player.findOne({ playerId });
    if (!player) throw new Error('Player not found');

    const price = await cryptoService.getPrice(currency);
    const cryptoAmount = cryptoService.convertUsdToCrypto(usdAmount, price);
    
    const wallet = player.getWallet(currency);
    if (wallet.balance < cryptoAmount) {
      throw new Error('Insufficient balance');
    }

    wallet.balance -= cryptoAmount;
    await player.save();

    const bet = {
      playerId,
      usdAmount,
      cryptoAmount,
      currency,
      priceAtTime: price
    };

    if (!this.currentRound) {
      await this.startNewRound();
    }

    this.currentRound.bets.push(bet);
    await this.currentRound.save();

    // Log transaction
    const transactionHash = crypto.randomBytes(16).toString('hex');
    await new Transaction({
      playerId,
      usdAmount,
      cryptoAmount,
      currency,
      transactionType: 'bet',
      transactionHash,
      priceAtTime: price,
      roundId: this.currentRound.roundId
    }).save();

    return { bet, transactionHash };
  }

  async cashOut(playerId) {
    if (this.gameState !== 'active') {
      throw new Error('No active round');
    }

    const currentMultiplier = this.getCurrentMultiplier();
    if (currentMultiplier >= this.crashPoint) {
      throw new Error('Game has crashed');
    }

    const bet = this.currentRound.bets.find(b => b.playerId === playerId && !b.cashedOut);
    if (!bet) throw new Error('No active bet found');

    bet.cashedOut = true;
    bet.cashoutMultiplier = currentMultiplier;
    bet.payout = bet.cryptoAmount * currentMultiplier;

    const player = await Player.findOne({ playerId });
    const wallet = player.getWallet(bet.currency);
    wallet.balance += bet.payout;
    
    await Promise.all([player.save(), this.currentRound.save()]);

    // Log cashout transaction
    const transactionHash = crypto.randomBytes(16).toString('hex');
    const price = await cryptoService.getPrice(bet.currency);
    await new Transaction({
      playerId,
      usdAmount: cryptoService.convertCryptoToUsd(bet.payout, price),
      cryptoAmount: bet.payout,
      currency: bet.currency,
      transactionType: 'cashout',
      transactionHash,
      priceAtTime: price,
      roundId: this.currentRound.roundId
    }).save();

    return { 
      payout: bet.payout, 
      multiplier: currentMultiplier,
      usdValue: cryptoService.convertCryptoToUsd(bet.payout, price),
      transactionHash 
    };
  }

  async endRound() {
    if (this.gameState !== 'active') return;

    this.gameState = 'crashed';
    this.currentRound.status = 'crashed';
    this.currentRound.endTime = new Date();
    await this.currentRound.save();

    // Reset for next round
    setTimeout(() => {
      this.gameState = 'waiting';
      this.currentRound = null;
    }, 3000);

    return this.currentRound;
  }

  getGameState() {
    return {
      status: this.gameState,
      multiplier: this.getCurrentMultiplier(),
      crashPoint: this.gameState === 'crashed' ? this.crashPoint : null,
      roundId: this.currentRound?.roundId,
      bets: this.currentRound?.bets || []
    };
  }
}

module.exports = new GameService();