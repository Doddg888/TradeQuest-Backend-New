const express = require('express');
const router = express.Router();
const axios = require('axios');

// Fetch trading pairs from Bitget API
router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.bitget.com/api/v2/mix/market/tickers', {
      headers: {
        'API-KEY': process.env.BITGET_API_KEY,
      },
    });

    // Send the trading pairs data to the client
    res.json(response.data.data);
  } catch (error) {
    console.error('Error fetching trading pairs:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch trading pairs' });
  }
});

module.exports = router;
