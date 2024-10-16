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

// Import local modules
const Trade = require('./models/Trade');
const connectWebSocket = require('./websocket');

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

// Call WebSocket function and pass the Socket.io instance
connectWebSocket(io);

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
  const { symbol, orderType, entryPoint, stopLoss, takeProfit, margin, leverage } = req.body;
  const userId = req.user.user_id; // Get user_id from the decoded JWT

  try {
    // Validation
    if (!userId || !symbol || !orderType || !margin || !leverage) {
      return res.status(400).json({ message: 'UserId, symbol, order type, margin, and leverage are required' });
    }

    // For limit orders, entryPoint is required
    if (orderType === 'limit' && !entryPoint) {
      return res.status(400).json({ message: 'Entry point is required for limit orders' });
    }

    // Calculate quantity based on margin and leverage
    const quantity = margin * leverage;

    // Create the trade
    const newTrade = new Trade({
      userId,
      symbol,
      orderType,
      entryPoint: orderType === 'limit' ? entryPoint : null,
      stopLoss: stopLoss || null,
      takeProfit: takeProfit || null,
      margin,
      leverage,
      quantity,
      status: 'open',
    });

    // Save the trade to MongoDB
    await newTrade.save();

    // Execute immediately if it's a market order
    if (orderType === 'market') {
      const response = await axios.get(`https://api.bitget.com/api/v2/mix/market/symbol-price`, {
        params: { symbol, productType: 'usdt-futures' },
        headers: { 'API-KEY': process.env.BITGET_API_KEY },
      });

      const marketPrice = parseFloat(response.data.data[0].price);

      // Update trade status to executed
      newTrade.status = 'executed';
      newTrade.entryPoint = marketPrice;
      newTrade.executedAt = new Date();

      await newTrade.save();

      return res.json({ message: 'Market order executed', trade: newTrade, executedPrice: marketPrice });
    }

    res.json({ message: 'Limit order created', trade: newTrade });
  } catch (error) {
    console.error('Error submitting trade:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Fetch open limit orders for the user
app.get('/api/open-orders/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const openOrders = await Trade.find({ userId, status: 'open', orderType: 'limit' });
    res.json(openOrders);
  } catch (error) {
    console.error('Error fetching open orders:', error);
    res.status(500).json({ message: 'Failed to fetch open orders' });
  }
});

// Fetch executed positions for the user
app.get('/api/executed-trades/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;

  try {
    const executedTrades = await Trade.find({ userId, status: 'executed' });

    // Aggregate the executed trades to calculate positions
    const positions = executedTrades.reduce((acc, trade) => {
      if (!acc[trade.symbol]) {
        acc[trade.symbol] = {
          symbol: trade.symbol,
          totalMargin: 0,
          totalQuantity: 0,
          averageEntryPrice: 0,
          unrealizedPnL: 0,
          realizedPnL: 0,
          trades: []
        };
      }

      acc[trade.symbol].totalMargin += trade.margin;
      acc[trade.symbol].totalQuantity += trade.quantity;

      // Calculate weighted average entry price
      acc[trade.symbol].averageEntryPrice = 
        ((acc[trade.symbol].averageEntryPrice * (acc[trade.symbol].totalQuantity - trade.quantity)) + (trade.entryPoint * trade.quantity)) / acc[trade.symbol].totalQuantity;

      acc[trade.symbol].trades.push(trade);

      return acc;
    }, {});

    res.json(Object.values(positions));
  } catch (error) {
    console.error('Error fetching executed trades:', error);
    res.status(500).json({ message: 'Failed to fetch executed trades' });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
