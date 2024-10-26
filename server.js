// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const Trade = require('./models/Trade');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

// Fetch trading pairs from Bitget
app.get('/api/pairs', async (req, res) => {
    try {
        const response = await axios.get('https://api.bitget.com/api/v2/mix/market/tickers');
        res.json(response.data.data);
    } catch (error) {
        console.error('Error fetching pairs:', error);
        res.status(500).json({ message: 'Failed to fetch trading pairs.' });
    }
});

// Submit a trade
app.post('/api/trade', async (req, res) => {
    const { userId, symbol, entryPoint, stopLoss, takeProfit } = req.body;

    if (!userId || !symbol || !entryPoint || !stopLoss || !takeProfit) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    const trade = new Trade({
        userId,
        symbol,
        entryPoint,
        stopLoss,
        takeProfit
    });

    try {
        const savedTrade = await trade.save();
        res.status(201).json(savedTrade);
    } catch (error) {
        console.error('Error saving trade:', error);
        res.status(500).json({ message: 'Failed to save trade.' });
    }
});

// Get user trades
app.get('/api/trades/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const trades = await Trade.find({ userId });
        res.json(trades);
    } catch (error) {
        console.error('Error fetching trades:', error);
        res.status(500).json({ message: 'Failed to fetch trades.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
