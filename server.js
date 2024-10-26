// server.js

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const Trade = require('./models/Trade');
const connectWebSocket = require('./websocket');

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
let clients = {};

// Function to broadcast messages to specific clients
function notifyClient(userId, message) {
    if (clients[userId]) {
        clients[userId].send(JSON.stringify(message));
    }
}

// Fetch trading pairs from Bitget V2 API
app.get('/api/trading-pairs', async (req, res) => {
    try {
        const response = await axios.get('https://api.bitget.com/api/v2/spot/market/tickers');
        res.json(response.data.data); // Ensure response structure matches your needs
    } catch (error) {
        console.error('Error fetching pairs:', error);
        res.status(500).json({ message: 'Failed to fetch trading pairs.' });
    }
});

// Submit a trade
app.post('/api/trade', async (req, res) => {
    const { userId, symbol, entryPoint, stopLoss, takeProfit } = req.body;

    if (!userId || !symbol || !entryPoint) {
        return res.status(400).json({ message: 'Missing required fields.' });
    }

    const trade = new Trade({ userId, symbol, entryPoint, stopLoss, takeProfit });
    try {
        const savedTrade = await trade.save();
        res.status(201).json(savedTrade);
        notifyClient(userId, { type: 'trade_submitted', trade: savedTrade });
        monitorTradePrice(savedTrade);
    } catch (error) {
        console.error('Error saving trade:', error);
        res.status(500).json({ message: 'Failed to save trade.' });
    }
});

// Monitor trade price logic (mocked for example purposes)
async function monitorTradePrice(trade) {
    const interval = setInterval(async () => {
        // Replace with actual price-checking from the WebSocket or API
        const currentPrice = Math.random() * 100; // Mock current price
        if (currentPrice >= trade.entryPoint) {
            notifyClient(trade.userId, { type: 'trade_triggered', tradeId: trade._id });
            clearInterval(interval);
        }
    }, 5000);
}

// WebSocket upgrade handling
const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

wss.on('connection', (ws, req) => {
    const userId = req.url.split('?userId=')[1];
    if (userId) {
        clients[userId] = ws;
        ws.on('close', () => delete clients[userId]);
    }
});

// Connect WebSocket to handle market updates
connectWebSocket(wss);

console.log(`WebSocket server is running on ws://localhost:${PORT}`);
