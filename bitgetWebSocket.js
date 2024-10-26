const WebSocket = require('ws');

const bitgetWsUrl = 'wss://ws.bitget.com/v2/ws/public';
let ws;
let subscribedPairs = [];

function connectWebSocket(io) {
    ws = new WebSocket(bitgetWsUrl);

    ws.on('open', () => {
        console.log('WebSocket connected to Bitget');
        subscribedPairs.forEach((pair) => {
            subscribeToPair(pair);
        });
    });

    ws.on('message', (data) => {
        try {
            const parsedData = JSON.parse(data);
            console.log('Received message:', JSON.stringify(parsedData, null, 2));

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
                    "instType": "FUTURES",
                    "channel": "ticker",
                    "instId": pair
                }
            ]
        }));
        console.log(`Subscribed to ${pair}`);
    }
}

function handleNewTrade(trade) {
    const pair = trade.symbol;
    subscribeToPair(pair);
}

module.exports = {
    connectWebSocket,
    handleNewTrade
};
