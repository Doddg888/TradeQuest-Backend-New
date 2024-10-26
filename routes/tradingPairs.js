const express = require('express');
const router = express.Router();
const axios = require('axios');
const TradingPair = require('../models/TradingPair');

// Fetch trading pairs from Bitget API and store them in MongoDB
router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.bitget.com/api/v2/mix/market/tickers', {
      headers: {
        'API-KEY': process.env.BITGET_API_KEY,
      },
    });

    const pairs = response.data.data;

    // Clear old data and insert new trading pairs
    await TradingPair.deleteMany({});
    await TradingPair.insertMany(pairs.map(pair => ({
      instId: pair.instId,
      instType: pair.instType
    })));

    // Fetch the stored pairs from MongoDB and send to the client
    const storedPairs = await TradingPair.find();
    res.json(storedPairs);
  } catch (error) {
    console.error('Error fetching trading pairs:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch trading pairs' });
  }
});

module.exports = router;
