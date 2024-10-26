require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { WebSocketServer } = require("ws");
const Trade = require("./models/Trade");
const axios = require("axios");

const app = express();
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Fetch trading pairs using Bitget V2 API
app.get("/api/trading-pairs", async (req, res) => {
    try {
        const response = await axios.get("https://api.bitget.com/api/v2/spot/market/tickers");

        // Log the response to inspect its structure
        console.log('API Response:', response.data);

        // Ensure the response contains data
        if (response.data && response.data.data) {
            const pairs = response.data.data.map((pair) => ({
                instId: pair.instId // Assuming instId is the key you're interested in
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
    const { userId, tradingPair, entry, leverage, margin, takeProfit, stopLoss } = req.body;

    try {
        const newTrade = await Trade.create({
            userId,
            tradingPair,
            entry,
            leverage,
            margin,
            takeProfit,
            stopLoss,
        });
        res.json({ success: true, tradeId: newTrade._id });
    } catch (error) {
        console.error('Error submitting trade:', error);
        res.status(500).json({ error: "Error submitting trade" });
    }
});

// WebSocket server for real-time monitoring
const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws, req) => {
    const tradingPair = req.url.split("/").pop(); // Extract trading pair from URL
    console.log(`WebSocket connection opened for ${tradingPair}`);

    ws.on("close", () => {
        console.log(`WebSocket connection closed for ${tradingPair}`);
    });
});

// Monitor trades and check for conditions
async function monitorTrades() {
    const trades = await Trade.find({ status: "open" });

    for (const trade of trades) {
        const currentPrice = await getCurrentPrice(trade.tradingPair);

        if (currentPrice) {
            const { entry, takeProfit, stopLoss } = trade;
            if (entry <= currentPrice && (!takeProfit || currentPrice < takeProfit) && (!stopLoss || currentPrice > stopLoss)) {
                await openTrade(trade);
            }
            if ((takeProfit && currentPrice >= takeProfit) || (stopLoss && currentPrice <= stopLoss)) {
                await closeTrade(trade);
            }
        }
    }
}

// Function to open a trade
async function openTrade(trade) {
    trade.status = "open";
    await trade.save();
    console.log(`Trade ${trade._id} opened at entry: ${trade.entry}`);
}

// Function to close a trade
async function closeTrade(trade) {
    trade.status = "closed";
    await trade.save();
    console.log(`Trade ${trade._id} closed`);
}

// Get current price from Bitget V2 API
async function getCurrentPrice(pair) {
    try {
        const response = await axios.get(`https://api.bitget.com/api/v2/spot/market/ticker?symbol=${pair}`);
        // Log the price response for debugging
        console.log(`Current price response for ${pair}:`, response.data);
        return parseFloat(response.data.data[0].last); // Adjust based on actual response structure
    } catch (error) {
        console.error(`Error fetching price for ${pair}:`, error);
        return null;
    }
}

// Check trades every 5 seconds
setInterval(monitorTrades, 5000);

// Start server and handle WebSocket upgrade
const server = app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
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
