// Load environment variables from .env file
require('dotenv').config();

// Import dependencies
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const http = require('http');
const socketIo = require('socket.io');
const WebSocket = require('ws');
const cron = require('node-cron');  // For scheduled tasks
const TradingPair = require('./models/TradingPair'); // Add this line if not already present

// Import local modules and routes
const TradingPair = require('./models/TradingPair'); // Trading pair model

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

// Scheduled Task to Fetch Trading Pairs
cron.schedule('0 * * * *', async () => {  // Runs every hour
  try {
    const response = await axios.get('https://api.bitget.com/api/v2/spot/public/products');
    const tradingPairs = response.data.data;

    // Clear existing trading pairs and save new ones
    await TradingPair.deleteMany({});
    await TradingPair.insertMany(tradingPairs.map(pair => ({
      instId: pair.instId,
      baseCurrency: pair.baseCurrency,
      quoteCurrency: pair.quoteCurrency,
    })));

    console.log("Trading pairs updated successfully");
  } catch (error) {
    console.error("Error updating trading pairs:", error);
  }
});

// Endpoint to fetch stored trading pairs
app.get('/api/trading-pairs', async (req, res) => {
  try {
    const pairs = await TradingPair.find({});
    res.json(pairs);
  } catch (error) {
    console.error("Error fetching trading pairs:", error);
    res.status(500).json({ message: "Failed to fetch trading pairs" });
  }
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
