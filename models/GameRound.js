const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  priceAtTime: { type: Number, required: true },
  cashedOut: { type: Boolean, default: false },
  cashoutMultiplier: { type: Number },
  payout: { type: Number }
});

const gameRoundSchema = new mongoose.Schema({
  roundId: { type: String, required: true, unique: true },
  seed: { type: String, required: true },
  hash: { type: String, required: true },
  crashPoint: { type: Number, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date },
  bets: [betSchema],
  status: { type: String, enum: ['waiting', 'active', 'crashed'], default: 'waiting' }
});

module.exports = mongoose.model('GameRound', gameRoundSchema);