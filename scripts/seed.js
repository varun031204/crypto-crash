require('dotenv').config();
const mongoose = require('mongoose');
const Player = require('../models/Player');
const GameRound = require('../models/GameRound');
const Transaction = require('../models/Transaction');

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Player.deleteMany({}),
      GameRound.deleteMany({}),
      Transaction.deleteMany({})
    ]);

    // Create sample players with wallets
    const players = [
      {
        playerId: 'player1',
        wallets: [
          { currency: 'BTC', balance: 0.01 },
          { currency: 'ETH', balance: 0.5 }
        ]
      },
      {
        playerId: 'player2',
        wallets: [
          { currency: 'BTC', balance: 0.005 },
          { currency: 'ETH', balance: 1.0 }
        ]
      },
      {
        playerId: 'player3',
        wallets: [
          { currency: 'BTC', balance: 0.02 },
          { currency: 'ETH', balance: 0.8 }
        ]
      },
      {
        playerId: 'player4',
        wallets: [
          { currency: 'BTC', balance: 0.015 },
          { currency: 'ETH', balance: 0.3 }
        ]
      },
      {
        playerId: 'player5',
        wallets: [
          { currency: 'BTC', balance: 0.008 },
          { currency: 'ETH', balance: 0.6 }
        ]
      }
    ];

    await Player.insertMany(players);
    console.log('Created 5 sample players with crypto wallets');

    // Create sample game rounds
    const sampleRounds = [
      {
        roundId: '1699000000000',
        seed: 'sample_seed_1',
        hash: 'sample_hash_1',
        crashPoint: 2.45,
        startTime: new Date(Date.now() - 300000),
        endTime: new Date(Date.now() - 240000),
        status: 'crashed',
        bets: [
          {
            playerId: 'player1',
            usdAmount: 10,
            cryptoAmount: 0.0002,
            currency: 'BTC',
            priceAtTime: 50000,
            cashedOut: true,
            cashoutMultiplier: 2.1,
            payout: 0.00042
          },
          {
            playerId: 'player2',
            usdAmount: 20,
            cryptoAmount: 0.0004,
            currency: 'BTC',
            priceAtTime: 50000,
            cashedOut: false
          }
        ]
      },
      {
        roundId: '1699000060000',
        seed: 'sample_seed_2',
        hash: 'sample_hash_2',
        crashPoint: 1.23,
        startTime: new Date(Date.now() - 240000),
        endTime: new Date(Date.now() - 180000),
        status: 'crashed',
        bets: [
          {
            playerId: 'player3',
            usdAmount: 15,
            cryptoAmount: 0.01,
            currency: 'ETH',
            priceAtTime: 1500,
            cashedOut: false
          }
        ]
      }
    ];

    await GameRound.insertMany(sampleRounds);
    console.log('Created 2 sample game rounds');

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();