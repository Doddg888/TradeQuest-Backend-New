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

    // Check if data was returned successfully
    if (response.data && response.data.data) {
      res.json(response.data.data);
    } else {
      console.error('Unexpected response structure:', response.data);
      res.status(500).json({ message: 'Unexpected response structure from Bitget' });
    }
  } catch (error) {
    console.error('Error fetching trading pairs:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to fetch trading pairs' });
  }
});

module.exports = router;
