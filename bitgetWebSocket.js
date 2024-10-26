const WebSocket = require('ws');

const bitgetWsUrl = 'wss://ws.bitget.com/v2/ws/public';
let ws;

// This array will hold the trading pairs that are currently subscribed
let subscribedPairs = [];

function connectWebSocket(io) {
    ws = new WebSocket(bitgetWsUrl);

    ws.on('open', () => {
        console.log('WebSocket connected to Bitget');
        // Subscribe to existing pairs in subscribedPairs
        subscribedPairs.forEach((pair) => {
            subscribeToPair(pair);
        });
    });

    ws.on('message', (data) => {
        try {
            const parsedData = JSON.parse(data);
            console.log('Received message:', JSON.stringify(parsedData, null, 2));

            // Check if the message contains ticker data
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

// Function to subscribe to a specific trading pair
function subscribeToPair(pair) {
    if (!subscribedPairs.includes(pair)) {
        subscribedPairs.push(pair); // Add pair to the subscribed list
        ws.send(JSON.stringify({
            "op": "subscribe",
            "args": [
                {
                    "instType": "FUTURES",
                    "channel": "ticker",
                    "instId": pair
                }
            ]
        }));
        console.log(`Subscribed to ${pair}`);
    }
}

// Function to handle newly opened trades
function handleNewTrade(trade) {
    const pair = trade.symbol; // Get the trading pair from the trade
    subscribeToPair(pair); // Subscribe to this trading pair
    console.log(`Automatically subscribed to new trade pair: ${pair}`); // Log the subscription
}

module.exports = {
    connectWebSocket,
    handleNewTrade // Export handleNewTrade for external use
};
