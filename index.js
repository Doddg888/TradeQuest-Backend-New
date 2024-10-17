// Load environment variables from .env file
require('dotenv').config();

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken'); // Add jwt for token verification
const WebSocket = require('ws'); // Add ws package for WebSocket

// Import local modules
const Trade = require('./models/Trade');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);
const io = socketIo(server);

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Set up Bitget WebSocket connection
const bitgetWs = new WebSocket('wss://ws.bitget.com/mix/v1/market');

// Function to handle WebSocket subscription message
const subscribeToTicker = (symbol) => {
  const message = JSON.stringify({
    op: 'subscribe',
    args: [
      {
        instType: 'mc', // USDT futures
        channel: 'ticker',
        instId: symbol
      }
    ]
  });
  bitgetWs.send(message);
};

// WebSocket event listeners for Bitget
bitgetWs.on('open', () => {
  console.log('Connected to Bitget WebSocket');
  // Subscribe to BTCUSDT and ETHUSDT ticker data
  subscribeToTicker('BTCUSDT');
  subscribeToTicker('ETHUSDT');
});

bitgetWs.on('message', (data) => {
  const message = JSON.parse(data);
  // Ensure it's a ticker update
  if (message.arg && message.arg.channel === 'ticker') {
    const tickerData = message.data[0];
    // Send ticker data to all connected clients via Socket.IO
    io.emit('tickerUpdate', tickerData);
  }
});

bitgetWs.on('error', (error) => {
  console.error('WebSocket error:', error);
});

bitgetWs.on('close', () => {
  console.log('WebSocket connection closed');
});

// Caching Twitch's public keys to avoid frequent network requests
let cachedKeys = null;

// Function to fetch Twitch public keys
const getTwitchPublicKeys = async () => {
  if (cachedKeys) {
    return cachedKeys;
  }

  try {
    const response = await axios.get('https://id.twitch.tv/oauth2/keys');
    cachedKeys = response.data.keys;
    return cachedKeys;
  } catch (error) {
    console.error('Failed to fetch Twitch public keys:', error);
    throw new Error('Unable to verify token');
  }
};

// JWT Verification Middleware using Twitch Public Keys
const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header provided' });
  }

  const token = authHeader.split(' ')[1]; // Extract the token from "Bearer <token>"

  try {
    const keys = await getTwitchPublicKeys();
    const decodedHeader = jwt.decode(token, { complete: true });
    const kid = decodedHeader.header.kid;

    // Find the corresponding public key
    const key = keys.find(k => k.kid === kid);
    if (!key) {
      return res.status(401).json({ message: 'Invalid token key ID' });
    }

    // Construct the public key from the key's modulus and exponent
    const publicKey = `-----BEGIN RSA PUBLIC KEY-----\n${key.n}\n-----END RSA PUBLIC KEY-----`;

    // Verify the token
    const decoded = jwt.verify(token, publicKey);
    req.user = decoded; // Attach the decoded token data to the request object
    next(); // Proceed to the next middleware or route handler
  } catch (err) {
    console.error('JWT verification failed:', err);
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

// Health Check Route
app.get('/', (req, res) => {
  res.send('Welcome to the TradeQuest Backend API!');
});

// Endpoint to fetch available futures trading pairs
app.get('/api/futures-pairs', verifyToken, async (req, res) => {
  try {
    const productType = 'USDT-FUTURES';
    const response = await axios.get(`https://api.bitget.com/api/v2/mix/market/tickers`, {
      params: { productType },
      headers: { 'API-KEY': process.env.BITGET_API_KEY },
    });

    res.json(response.data.data);
  } catch (error) {
    console.error('Error fetching futures pairs:', error);
    res.status(500).json({ message: 'Failed to fetch futures pairs' });
  }
});

// Submit a new trade and execute market orders immediately
app.post('/api/trade', verifyToken, async (req, res) => {
  // Code for submitting a new trade (as given)
  // ...
});

// Fetch open limit orders for the user
app.get('/api/open-orders/:userId', verifyToken, async (req, res) => {
  // Code for fetching open orders (as given)
  // ...
});

// Fetch executed positions for the user
app.get('/api/executed-trades/:userId', verifyToken, async (req, res) => {
  // Code for fetching executed trades (as given)
  // ...
});

// Socket.IO setup for broadcasting updates
io.on('connection', (client) => {
  console.log('New client connected');
  client.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
