# Crypto Crash Game Backend

A real-time multiplayer crash game where players bet in USD, converted to cryptocurrency using live prices, and cash out before the game crashes.

## Features

- **Real-time multiplayer gameplay** with WebSocket support
- **Cryptocurrency integration** with live price fetching from CoinGecko API
- **Provably fair crash algorithm** using cryptographic hashing
- **Multi-currency wallet system** supporting BTC and ETH
- **Transaction logging** with simulated blockchain transactions
- **Atomic balance updates** with MongoDB transactions

## Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd crypto-crash
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
# Copy .env file and update MongoDB URI if needed
# Default configuration works with local MongoDB
```

4. Start MongoDB (if running locally):
```bash
mongod
```

5. Seed the database with sample data:
```bash
npm run seed
```

6. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Wallet Management
- `GET /api/wallet/:playerId` - Get player wallet balances in crypto and USD
- `GET /api/prices/:currency` - Get current cryptocurrency price

### Game Operations
- `POST /api/bet` - Place a bet in USD, converted to crypto
- `POST /api/cashout` - Cash out current bet
- `GET /api/game/state` - Get current game state

### Example API Calls

```bash
# Check wallet balance
curl http://localhost:3000/api/wallet/player1

# Place a $10 BTC bet
curl -X POST http://localhost:3000/api/bet \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player1","usdAmount":10,"currency":"BTC"}'

# Cash out
curl -X POST http://localhost:3000/api/cashout \
  -H "Content-Type: application/json" \
  -d '{"playerId":"player1"}'
```

## WebSocket Events

### Client → Server
- `cashout` - Request to cash out with `{playerId}`

### Server → Client
- `gameState` - Current game state on connection
- `roundStart` - New round started
- `multiplierUpdate` - Real-time multiplier updates (every 100ms)
- `playerCashout` - Another player cashed out
- `roundCrash` - Round ended with crash point
- `cashoutSuccess` - Successful cashout confirmation
- `cashoutError` - Cashout error message

## Provably Fair Algorithm

The crash point is generated using a cryptographically secure method:

1. **Seed Generation**: Random 32-byte seed for each round
2. **Hash Creation**: SHA-256 hash of the seed
3. **Crash Point Calculation**: 
   ```javascript
   const hash = crypto.createHash('sha256').update(seed + roundId).digest('hex');
   const hashInt = parseInt(hash.substring(0, 8), 16);
   const crashPoint = Math.max(1.01, (hashInt % (MAX_CRASH * 100)) / 100);
   ```

Players can verify fairness by:
- Checking the seed and hash provided for each round
- Recalculating the crash point using the same algorithm
- Confirming the hash matches the seed

## USD-to-Crypto Conversion

1. **Real-time Prices**: Fetched from CoinGecko API every 10 seconds
2. **Conversion Logic**:
   - Bet: `cryptoAmount = usdAmount / currentPrice`
   - Payout: `usdValue = cryptoAmount * currentPrice`
3. **Price Caching**: 10-second cache to handle API rate limits
4. **Fallback**: Uses cached price if API fails

## Game Logic

### Round Lifecycle
1. **Waiting Phase** (10 seconds): Players place bets
2. **Active Phase**: Multiplier increases exponentially
3. **Crash**: Game ends at predetermined crash point
4. **Reset**: 3-second cooldown before next round

### Multiplier Formula
```javascript
multiplier = 1 + (timeElapsed * growthFactor)
```

### Betting Rules
- Minimum bet: $0.01
- Bets only accepted during waiting phase
- Insufficient balance prevents betting
- All bets converted to crypto at current price

### Cashout Rules
- Only during active phase
- Before crash point is reached
- Payout = `betAmount * currentMultiplier`
- Instant balance update

## Testing

### WebSocket Client
Open `test/websocket-client.html` in a browser to test real-time functionality:
- Place bets
- Cash out in real-time
- View multiplier updates
- Monitor other players' actions

### API Testing
Use the provided `test/api-tests.http` file with REST Client extension or similar tools.

### Sample Data
The seed script creates:
- 5 players with BTC and ETH wallets
- Sample transaction history
- Previous game rounds

## Database Schema

### Player
```javascript
{
  playerId: String,
  wallets: [{
    currency: String, // BTC, ETH
    balance: Number
  }]
}
```

### GameRound
```javascript
{
  roundId: String,
  seed: String,
  hash: String,
  crashPoint: Number,
  startTime: Date,
  endTime: Date,
  bets: [BetSchema],
  status: String // waiting, active, crashed
}
```

### Transaction
```javascript
{
  playerId: String,
  usdAmount: Number,
  cryptoAmount: Number,
  currency: String,
  transactionType: String, // bet, cashout
  transactionHash: String,
  priceAtTime: Number,
  roundId: String,
  timestamp: Date
}
```

## Architecture

- **Express.js**: REST API server
- **Socket.IO**: WebSocket implementation
- **MongoDB**: Data persistence with Mongoose ODM
- **CoinGecko API**: Real-time cryptocurrency prices
- **Crypto Module**: Provably fair random generation

## Security Features

- Input validation for all API endpoints
- Cryptographically secure random number generation
- Atomic database transactions for balance updates
- WebSocket message validation
- API rate limit handling with fallback caching

## Performance Optimizations

- Price caching (10-second intervals)
- Efficient multiplier updates (100ms intervals)
- Database indexing on frequently queried fields
- Connection pooling for MongoDB
- Minimal WebSocket payload sizes

## Error Handling

- Graceful API failures with cached data fallback
- Comprehensive input validation
- Database transaction rollbacks on errors
- WebSocket connection recovery
- Detailed error logging

## Production Considerations

- Environment-specific configuration
- Database connection pooling
- Rate limiting middleware
- HTTPS/WSS for secure connections
- Horizontal scaling with Redis for session management
- Monitoring and logging integration