const WebSocket = require('ws');

const websocketUrl = 'wss://your-secure-websocket-url'; // Ensure this is a secure WebSocket URL
let ws;
let subscribedPairs = [];

function connectWebSocket(io) {
    ws = new WebSocket(websocketUrl);

    ws.on('open', () => {
        console.log('WebSocket connected');
        subscribedPairs.forEach((pair) => {
            subscribeToPair(pair);
        });
    });

    ws.on('message', (data) => {
        try {
            const parsedData = JSON.parse(data);
            console.log('Received message:', JSON.stringify(parsedData, null, 2));

            // Handle your messages accordingly
        } catch (error) {
            console.error('Error parsing WebSocket message:', error.message);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed, reconnecting...');
        setTimeout(() => connectWebSocket(io), 5000);
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
}

function subscribeToPair(pair) {
    if (!subscribedPairs.includes(pair)) {
        subscribedPairs.push(pair);
        ws.send(JSON.stringify({
            "op": "subscribe",
            "args": [
                {
                    "channel": "your-channel",
                    "instId": pair
                }
            ]
        }));
        console.log(`Subscribed to ${pair}`);
    }
}

module.exports = {
    connectWebSocket,
    subscribeToPair
};
