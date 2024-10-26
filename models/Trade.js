<<<<<<< HEAD
// models/Trade.js

const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    symbol: { type: String, required: true },
    entryPoint: { type: Number, required: true },
    stopLoss: { type: Number, required: true },
    takeProfit: { type: Number, required: true },
    unrealizedPnL: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Trade', tradeSchema);
=======
const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  symbol: {
    type: String,
    required: true,
  },
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
  stopLoss: {
    type: Number,
    default: null, // Optional
  },
  takeProfit: {
    type: Number,
    default: null, // Optional
  },
  margin: {
    type: Number,
    required: true,
  },
  leverage: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number, // Quantity is not required, will be calculated
    default: 0,
  },
  status: {
    type: String,
    default: 'open',
  },
  executedAt: {
    type: Date,
    default: null,
  },
});

const Trade = mongoose.model('Trade', TradeSchema);

module.exports = Trade;
>>>>>>> 89ec911b4f263cb93b444f9f3246f5f69825cb1e
