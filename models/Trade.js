const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    symbol: { type: String, required: true },
    entryPoint: { type: Number, required: true }, // Entry price
    stopLoss: { type: Number, default: null },
    takeProfit: { type: Number, default: null },
    margin: { type: Number, required: true },
    leverage: { type: Number, required: true },
    quantity: { type: Number, default: 0 },
    unrealizedPnL: { type: Number, default: 0 },
    status: { type: String, default: 'pending' }, // Initial status is 'pending'
    createdAt: { type: Date, default: Date.now },
    executedAt: { type: Date, default: null },
});

module.exports = mongoose.model('Trade', tradeSchema);
