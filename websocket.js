// websocket.js
const WebSocket = require('ws');

const bitgetWsUrl = 'wss://ws.bitget.com/v2/ws/public';
let ws;

let subscribedPairs = ['BTCUSDT', 'ETHUSDT']; // Add more pairs if needed

function connectWebSocket(io) {
  ws = new WebSocket(bitgetWsUrl);

  ws.on('open', () => {
    console.log('WebSocket connected to Bitget');
    
    subscribedPairs.forEach((pair) => {
      ws.send(JSON.stringify({
        "op": "subscribe",
        "args": [
          {
            "instType": "SPOT", // For futures, use 'USDT-FUTURES'
            "channel": "ticker",
            "instId": pair
          }
        ]
      }));
    });
  });

  ws.on('message', (data) => {
    try {
      const parsedData = JSON.parse(data);
      
      // Log the received message to inspect its structure
      console.log('Received message:', JSON.stringify(parsedData, null, 2));

      // Make sure the structure matches before accessing properties
      if (parsedData && parsedData.arg && parsedData.arg.channel === 'ticker' && parsedData.data && parsedData.data[0]) {
        const priceData = parsedData.data[0];
        const symbol = parsedData.arg.instId;
        const latestPrice = priceData.last;

        // Broadcast the price update to the frontend via WebSocket
        io.emit('price-update', { symbol, price: latestPrice });
      } else {
        console.log('Unexpected data structure:', parsedData);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error.message);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed, reconnecting...');
    setTimeout(() => connectWebSocket(io), 5000); // Reconnect after 5 seconds
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
}

module.exports = connectWebSocket;
