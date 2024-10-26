// routes/tradingPairs.js

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Endpoint to fetch trading pairs
router.get('/', async (req, res) => {
  try {
    const response = await axios.get('https://api.bitget.com/api/v2/spot/public/symbols'); // Adjust endpoint as needed
    res.json(response.data.data);
  } catch (error) {
    console.error('Error fetching trading pairs:', error);
    res.status(500).json({ message: 'Failed to fetch trading pairs' });
  }
});

module.exports = router;
