// Load environment variables from .env file
require('dotenv').config();

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

// Import local modules and routes
const Trade = require('./models/Trade');
const tradingPairsRoute = require('./routes/tradingPairs');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());

// Register the trading pairs route
app.use('/api/trading-pairs', tradingPairsRoute);

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Dynamic WebSocket subscription based on requested symbol
let bitgetWs;
const connectToBitget = (symbols = []) => {
  bitgetWs = new WebSocket('wss://ws.bitget.com/v2/ws/public');

  bitgetWs.on('open', () => {
    console.log('Connected to Bitget WebSocket');
    subscribeToTickers(symbols);

    // Set up ping/pong to keep the connection alive
    setInterval(() => {
      if (bitgetWs.readyState === WebSocket.OPEN) {
        console.log('Sending ping to Bitget WebSocket');
        bitgetWs.send('ping');
      }
    }, 30000);
  });

  bitgetWs.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      if (message === 'pong') return;
      
      // Emit ticker updates to all clients
      if (message.arg && message.arg.channel === 'ticker' && message.data) {
        const tickerData = message.data[0];
        io.emit('tickerUpdate', tickerData);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  bitgetWs.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  bitgetWs.on('close', () => {
    console.log('WebSocket connection closed. Reconnecting in 5 seconds...');
    setTimeout(() => connectToBitget(symbols), 5000);
  });
};

// Subscription message function
const subscribeToTickers = (symbols) => {
  const subscriptions = symbols.map(symbol => ({
    instType: 'SPOT',
    channel: 'ticker',
    instId: symbol
  }));

  const message = JSON.stringify({
    op: 'subscribe',
    args: subscriptions
  });

  if (bitgetWs.readyState === WebSocket.OPEN) {
    bitgetWs.send(message);
  }
};

// Start WebSocket connection with default symbols
connectToBitget(['BTCUSDT', 'ETHUSDT']);

// New Endpoint to fetch live prices for a specific trading pair
app.get('/api/futures-pairs/:symbol/price', async (req, res) => {
  const { symbol } = req.params;
  try {
    const response = await axios.get(`https://api.bitget.com/api/v2/mix/market/ticker`, {
      params: { symbol },
      headers: { 'API-KEY': process.env.BITGET_API_KEY },
    });

    res.json(response.data.data);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    res.status(500).json({ message: 'Failed to fetch price' });
  }
});

// Socket.IO setup for broadcasting updates
io.on('connection', (client) => {
  console.log('New client connected');
  client.on('subscribeToPair', (symbol) => {
    console.log(`Client subscribed to ${symbol}`);
    connectToBitget([symbol]);
  });

  client.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
