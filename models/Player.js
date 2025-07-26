const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  currency: { type: String, required: true }, // BTC, ETH
  balance: { type: Number, default: 0 }
});

const playerSchema = new mongoose.Schema({
  playerId: { type: String, required: true, unique: true },
  wallets: [walletSchema],
  createdAt: { type: Date, default: Date.now }
});

playerSchema.methods.getWallet = function(currency) {
  let wallet = this.wallets.find(w => w.currency === currency);
  if (!wallet) {
    wallet = { currency, balance: 0 };
    this.wallets.push(wallet);
  }
  return wallet;
};

module.exports = mongoose.model('Player', playerSchema);