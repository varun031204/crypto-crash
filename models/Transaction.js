const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  usdAmount: { type: Number, required: true },
  cryptoAmount: { type: Number, required: true },
  currency: { type: String, required: true },
  transactionType: { type: String, enum: ['bet', 'cashout'], required: true },
  transactionHash: { type: String, required: true },
  priceAtTime: { type: Number, required: true },
  roundId: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', transactionSchema);