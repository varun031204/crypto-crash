const axios = require('axios');

class CryptoService {
  constructor() {
    this.priceCache = new Map();
    this.cacheTimeout = 10000; // 10 seconds
    this.apiUrl = process.env.COINGECKO_API_URL;
  }

  async getPrice(currency) {
    const cacheKey = currency.toLowerCase();
    const cached = this.priceCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.price;
    }

    try {
      const response = await axios.get(`${this.apiUrl}/simple/price`, {
        params: {
          ids: this.getCoinId(currency),
          vs_currencies: 'usd'
        }
      });
      
      const coinId = this.getCoinId(currency);
      const price = response.data[coinId]?.usd;
      
      if (!price) throw new Error(`Price not found for ${currency}`);
      
      this.priceCache.set(cacheKey, { price, timestamp: Date.now() });
      return price;
    } catch (error) {
      if (cached) return cached.price; // Fallback to cached price
      throw new Error(`Failed to fetch price for ${currency}: ${error.message}`);
    }
  }

  getCoinId(currency) {
    const mapping = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum'
    };
    return mapping[currency.toUpperCase()] || currency.toLowerCase();
  }

  convertUsdToCrypto(usdAmount, cryptoPrice) {
    return usdAmount / cryptoPrice;
  }

  convertCryptoToUsd(cryptoAmount, cryptoPrice) {
    return cryptoAmount * cryptoPrice;
  }
}

module.exports = new CryptoService();