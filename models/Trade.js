// models/Trade.js

const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    symbol: { type: String, required: true },
    orderType: {
        type: String,
        required: true,
        enum: ['market', 'limit'], // Valid order types
    },
    entryPoint: {
        type: Number,
        required: function () {
            return this.orderType === 'limit'; // Only required for limit orders
        },
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

module.exports = mongoose.model('Trade', tradeSchema);
