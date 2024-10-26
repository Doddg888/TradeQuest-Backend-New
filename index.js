require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { WebSocketServer } = require("ws");
const Trade = require("./models/Trade");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Fetch trading pairs using Bitget V2 API
app.get("/api/trading-pairs", async (req, res) => {
    try {
        const response = await axios.get("https://api.bitget.com/api/v2/spot/market/tickers");
        console.log('API Response:', response.data);

        if (response.data && response.data.data) {
            const pairs = response.data.data.map((pair) => ({
                symbol: pair.symbol || pair.instId,
                lastPrice: pair.lastPr,
                bidPrice: pair.bidPr,
                askPrice: pair.askPr,
                high24h: pair.high24h,
                low24h: pair.low24h
            }));
            res.json(pairs);
        } else {
            res.status(500).json({ error: "Unexpected API response structure" });
        }
    } catch (error) {
        console.error('Error fetching trading pairs:', error);
        res.status(500).json({ error: "Error fetching trading pairs" });
    }
});

// Submit a trade
app.post("/api/submit-trade", async (req, res) => {
    const { userId, symbol, entryPoint, leverage, margin, takeProfit, stopLoss } = req.body;

    try {
        const newTrade = await Trade.create({
            userId,
            symbol,
            entryPoint,
            stopLoss,
            takeProfit,
            margin,
            leverage,
            status: 'pending' // Set initial status
        });
        
        res.json({ success: true, tradeId: newTrade._id });

        // Start monitoring the trade price immediately
        monitorTradePrice(newTrade);

    } catch (error) {
        console.error('Error submitting trade:', error);
        res.status(500).json({ error: "Error submitting trade" });
    }
});

// Monitor trade price
async function monitorTradePrice(trade) {
    const interval = setInterval(async () => {
        const currentPrice = await getCurrentPrice(trade.symbol);

        if (currentPrice) {
            console.log(`Current price for ${trade.symbol}: ${currentPrice}`);
            if (currentPrice >= trade.entryPoint) { // Compare against entryPoint
                await openTrade(trade);
                clearInterval(interval);
            }
        }
    }, 5000);
}

// Open a trade
async function openTrade(trade) {
    trade.status = "open"; // Change status to open
    await trade.save();

    console.log(`Trade ${trade._id} opened at entry: ${trade.entryPoint}`);
    notifyFrontendTradeOpen(trade);
}

// Notify frontend about opened trade
function notifyFrontendTradeOpen(trade) {
    const message = {
        status: "opened",
        tradeId: trade._id,
        tradingPair: trade.symbol,
        entry: trade.entryPoint
    };

    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
        }
    });
}

// Get current price from Bitget V2 API
async function getCurrentPrice(pair) {
    try {
        if (!pair) {
            console.error('No trading pair provided');
            return null;
        }
        const response = await axios.get(`https://api.bitget.com/api/v2/spot/market/ticker?symbol=${pair}`);
        return parseFloat(response.data.data[0].last);
    } catch (error) {
        console.error(`Error fetching price for ${pair}:`, error);
        return null;
    }
}

// Endpoint to fetch open trades for a specific user
app.get("/api/open-trades/:userId", async (req, res) => {
    const { userId } = req.params;

    try {
        const openTrades = await Trade.find({ userId, status: 'open' });
        res.json(openTrades);
    } catch (error) {
        console.error('Error fetching open trades:', error);
        res.status(500).json({ error: "Error fetching open trades" });
    }
});

// Start server and handle WebSocket upgrade
const server = app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});

// Handle WebSocket connections
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
    const tradingPair = req.url.split("/").pop();
    console.log(`WebSocket connection opened for ${tradingPair}`);

    ws.on("close", () => {
        console.log(`WebSocket connection closed for ${tradingPair}`);
    });
});

server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

    if (pathname.startsWith("/ws/")) {
        wss.handleUpgrade(request, socket, head, (ws) => {
            wss.emit("connection", ws, request);
        });
    } else {
        socket.destroy();
    }
});
