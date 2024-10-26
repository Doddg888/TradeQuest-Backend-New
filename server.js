const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const { WebSocketServer } = require('ws');
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

// Set up WebSocket server
const wss = new WebSocketServer({ noServer: true });
const clients = {};

// Function to broadcast messages to specific clients
function notifyClient(userId, message) {
    if (clients[userId]) {
        clients[userId].send(JSON.stringify(message));
    }
}

// Fetch trading pairs from Bitget (V2 API)
app.get('/api/pairs', async (req, res) => {
    try {
        const response = await axios.get('https://api.bitget.com/api/v2/spot/market/tickers');
        res.json(response.data.data);
    } catch (error) {
        console.error('Error fetching pairs:', error);
        res.status(500).json({ message: 'Failed to fetch trading pairs.' });
    }
});

// Submit a trade with WebSocket notification setup
app.post('/api/trade', async (req, res) => {
    const { userId, symbol, entryPoint, stopLoss, takeProfit } = req.body;

    if (!userId || !symbol || entryPoint == null) {
        return res.status(400).json({ message: 'Missing required fields.' });
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

        // Notify WebSocket client about new trade
        notifyClient(userId, {
            type: 'trade_submitted',
            trade: savedTrade,
            message: 'Trade submitted and monitoring started.',
        });

        // Start monitoring the trade price
        monitorTradePrice(savedTrade);
    } catch (error) {
        console.error('Error saving trade:', error);
        res.status(500).json({ message: 'Failed to save trade.' });
    }
});

// Function to monitor trade price
async function monitorTradePrice(trade) {
    const interval = setInterval(async () => {
        try {
            const response = await axios.get(`https://api.bitget.com/api/v2/spot/market/ticker?symbol=${trade.symbol}`);
            const currentPrice = parseFloat(response.data.data.last); // Parse current price from API response

            if (currentPrice >= trade.entryPoint) {
                notifyClient(trade.userId, {
                    type: 'trade_triggered',
                    tradeId: trade._id,
                    message: 'Trade entry point reached!',
                });
                clearInterval(interval); // Stop monitoring
            }
        } catch (error) {
            console.error('Error fetching ticker data:', error);
            clearInterval(interval);
        }
    }, 5000); // Check every 5 seconds
}

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

// WebSocket upgrade
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// WebSocket connection handling
wss.on('connection', (ws, req) => {
    const userId = req.url.split('?userId=')[1];

    if (userId) {
        clients[userId] = ws;
        ws.on('close', () => delete clients[userId]);
    }

    ws.on('message', (message) => {
        console.log('Received message:', message);
        ws.send('Hello Client');
    });
});

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
