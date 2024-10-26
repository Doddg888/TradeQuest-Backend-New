require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const TradingPair = require('./models/TradingPair'); // Adjust the path to your model

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('Error connecting to MongoDB:', err);
});

// Fetch trading pairs from Bitget API
async function fetchTradingPairs() {
  try {
    const response = await axios.get('https://api.bitget.com/api/v2/mix/market/tickers', {
      params: { productType: 'USDT-FUTURES' },
      headers: { 'API-KEY': process.env.BITGET_API_KEY },
    });

    const tradingPairs = response.data.data;

    // Map only the fields we need and rename `symbol` to `instId` to match your schema
    return tradingPairs
      .filter(pair => pair.symbol) // Ensure the `symbol` exists
      .map(pair => ({ instId: pair.symbol })); // Rename `symbol` to `instId`
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    return [];
  }
}

// Populate MongoDB with trading pairs
async function populateTradingPairs() {
  const tradingPairs = await fetchTradingPairs();

  if (tradingPairs.length > 0) {
    try {
      await TradingPair.insertMany(tradingPairs);
      console.log('Trading pairs have been saved to MongoDB');
    } catch (insertError) {
      console.error('Error saving trading pairs to MongoDB:', insertError);
    }
  } else {
    console.log('No trading pairs to save');
  }

  mongoose.connection.close();
}

// Run the function
populateTradingPairs();
