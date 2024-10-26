require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const axios = require("axios");
const { WebSocketServer } = require("ws");
const Trade = require("./models/Trade"); // Ensure this model exists

const app = express();
app.use(express.json()); // Middleware to parse JSON requests

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

// Fetch trading pairs using Bitget V2 API
app.get("/api/trading-pairs", async (req, res) => {
    try {
        const response = await axios.get("https://api.bitget.com/api/v2/spot/market/tickers");
        const pairs = response.data.data.map((pair) => ({ instId: pair.instId })); // Adjust based on actual response structure
        res.json(pairs);
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
