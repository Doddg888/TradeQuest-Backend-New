// bitgetWebSocket.js
const WebSocket = require('ws');
const io = require('./server').io; // Import the Socket.IO instance from the server setup

// Create WebSocket connection to Bitget
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

// WebSocket event listeners
bitgetWs.on('open', () => {
  console.log('Connected to Bitget WebSocket');
  // Subscribe to BTCUSDT ticker data
  subscribeToTicker('BTCUSDT');
  // Add more symbols if needed
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

module.exports = bitgetWs;
