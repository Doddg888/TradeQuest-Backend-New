// File: index.js

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
mongoose.connect(process.env.MONGO_URI, {})
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));

// Function to handle Bitget WebSocket connection
let bitgetWs;
const connectToBitget = () => {
  bitgetWs = new WebSocket('wss://ws.bitget.com/v2/ws/public');

  bitgetWs.on('open', () => {
    console.log('Connected to Bitget WebSocket');
    // Subscribe to BTCUSDT and ETHUSDT ticker data
    subscribeToTicker('BTCUSDT_UMCBL');
    subscribeToTicker('ETHUSDT_UMCBL');

    // Set up ping/pong to keep the connection alive
    setInterval(() => {
      if (bitgetWs.readyState === WebSocket.OPEN) {
        console.log('Sending ping to Bitget WebSocket');
        bitgetWs.send(JSON.stringify({ op: 'ping' })); // Send ping as a JSON object
      }
    }, 30000); // Send ping every 30 seconds
  });

  bitgetWs.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      
      // Log the received message for debugging purposes
      console.log('Received WebSocket message:', message);

      if (message.event === 'pong') {
        console.log('Received pong from Bitget WebSocket');
      } else if (message.arg && message.arg.channel === 'ticker' && message.data && message.data.length > 0) {
        const tickerData = message.data[0];
        io.emit('tickerUpdate', tickerData);
      } else {
        console.warn('Unexpected message format or empty data:', message);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  bitgetWs.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  bitgetWs.on('close', () => {
    console.log('WebSocket connection closed. Attempting to reconnect in 5 seconds...');
    setTimeout(connectToBitget, 5000); // Reconnect after 5 seconds
  });
};

// Function to handle WebSocket subscription message
const subscribeToTicker = (symbol) => {
  const message = JSON.stringify({
    op: 'subscribe',
    args: [
      {
        instType: 'umcbl', // USDT-Margined Futures
        channel: 'ticker',
        instId: symbol
      }
    ]
  });

  // Log the subscription message being sent
  console.log('Sending subscription message:', message);

  bitgetWs.send(message);
};

// Start WebSocket connection to Bitget
connectToBitget();

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

// Submit a new trade and execute market orders immediately (as provided in your code)

// Fetch open limit orders for the user (as provided in your code)

// Fetch executed positions for the user (as provided in your code)

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
