const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
    try {
        // Fetch all futures pairs
        const response = await axios.get(`https://api.bitget.com/api/v2/mix/market/tickers`, {
            headers: {
                'API-KEY': process.env.BITGET_API_KEY,
            },
            params: {
                productType: 'USDT-FUTURES',
            }
        });

        // Extract trading pairs
        const pairs = response.data.data || [];
        res.json(pairs);
    } catch (error) {
        console.error('Error fetching trading pairs:', error.message);
        res.status(500).json({ message: 'Failed to fetch trading pairs' });
    }
});

module.exports = router;
