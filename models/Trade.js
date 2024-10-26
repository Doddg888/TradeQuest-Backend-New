const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    symbol: { type: String, required: true },
    entryPoint: {
        type: Number,
        required: true, // Make this always required for the entry price
    },
    stopLoss: { type: Number, default: null },
    takeProfit: { type: Number, default: null },
    margin: { type: Number, required: true },
    leverage: { type: Number, required: true },
    quantity: { type: Number, default: 0 }, // Will be calculated if needed
    unrealizedPnL: { type: Number, default: 0 },
    status: { type: String, default: 'open' },
    createdAt: { type: Date, default: Date.now },
    executedAt: { type: Date, default: null },
});

// Remove the orderType field
module.exports = mongoose.model('Trade', tradeSchema);
