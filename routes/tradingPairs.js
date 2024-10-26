// routes/tradingPairs.js
const express = require('express');
const axios = require('axios');
const router = express.Router();

// Fetch USDT futures trading pairs from Bitget V2 API
router.get('/', async (req, res) => {
    try {
        const response = await axios.get('https://api.bitget.com/api/v2/mix/market/tickers?productType=USDT-FUTURES', {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        res.json(response.data.data); // Send only the data field back to the frontend
    } catch (error) {
        console.error('Error fetching trading pairs:', error.message);
        res.status(500).json({ message: 'Failed to fetch trading pairs.' });
    }
});

module.exports = router;
